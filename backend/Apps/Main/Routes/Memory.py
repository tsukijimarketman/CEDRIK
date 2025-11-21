from dataclasses import asdict, dataclass
from datetime import datetime
import json
import re
from typing import List
from flask import jsonify, request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required # type: ignore
from mongoengine import ValidationError
from werkzeug.exceptions import NotAcceptable, HTTPException
from bson import ObjectId
from gridfs import GridFS
from mongoengine.connection import get_db

from backend.Apps.Main.Database import Transaction
from backend.Apps.Main.Database.Models import Memory
from backend.Apps.Main.Utils.Aggregate import Pagination, PaginationResults, match_list, match_regex
from backend.Apps.Main.Utils.Decorator import protect
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Error import BadBody, HttpValidationError, InvalidId, TooManyFiles
from backend.Lib.Logger import Logger
from backend.Apps.Main.Service.Memory import create_memory, DCreateMemory # type: ignore
from backend.Apps.Main.Utils import get_schema_of_dataclass, Collections, generate_embeddings, AuditType # type: ignore
from backend.Apps.Main.Utils.Enum import MemoryType, Role
from backend.Apps.Main.Utils.Audit import audit_collection # Add this import

memory = Blueprint("Memory", __name__)

@memory.route("/delete/<memory_id>", methods=["DELETE"])
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def delete(memory_id):
  """
  Soft delete a memory by ID
  If memory has a file, also delete the file from GridFS
  """
  if not ObjectId.is_valid(memory_id):
    raise InvalidId()

  try:
    user_token = get_token()
    
    with Transaction() as (session, db):
      col_mem = db.get_collection(Collections.MEMORY.value)
      col_audit = db.get_collection(Collections.AUDIT.value)

      # Get the memory to check for file
      memory_obj = Memory.objects(id=memory_id).first()
      if not memory_obj:
        raise InvalidId()

      # If memory has a file, delete it from GridFS
      if memory_obj.file_id:
        fs = GridFS(get_db())
        try:
          fs.delete(memory_obj.file_id)
          Logger.log.info(f"Deleted file from GridFS: {memory_obj.file_id}")
        except Exception as e:
          Logger.log.error(f"Error deleting file: {e}")

      # Soft delete (set deleted_at timestamp)
      result = Memory.objects(id=memory_id).update_one(
        deleted_at=datetime.utcnow()
      )

      if result == 0:
        raise InvalidId()

      # Log audit
      audit = audit_collection(
        type=AuditType.DELETE,
        collection=Collections.MEMORY,
        id=ObjectId(memory_id),
      )
      col_audit.insert_one(audit.to_mongo(), session=session)

    return jsonify({"message": "Memory deleted successfully"}), 200

  except InvalidId:
    raise InvalidId()
  except Exception as e:
    Logger.log.error(f"Delete error: {e}")
    raise HTTPException(description=str(e))

@memory.route("/update/<memory_id>", methods=["PUT"])
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def update(memory_id):
  """
  Update a memory by ID
  Supports both text and file updates
  """
  if not request.content_type or not request.content_type.startswith("multipart/form-data"):
    raise NotAcceptable(description="Content-Type must be multipart/form-data")

  # Validate memory_id
  if not ObjectId.is_valid(memory_id):
    raise InvalidId()

  try:
    update_data = {}
    
    # Get form data
    if request.form.get("title"):
      update_data["title"] = request.form.get("title")
    
    if request.form.get("text"):
      update_data["text"] = request.form.get("text")
    
    tags = request.form.getlist("tags")
    if tags:
      # Filter out empty strings
      tags = [tag for tag in tags if tag.strip()]
      if tags:
        update_data["tags"] = tags

    # Handle file replacement
    file = request.files.get("file")
    if file and file.filename:
      # Delete old file if it exists
      existing_memory = Memory.objects(id=memory_id).first()
      if existing_memory and existing_memory.file_id:
        fs = GridFS(get_db())
        try:
          fs.delete(existing_memory.file_id)
          Logger.log.info(f"Deleted old file: {existing_memory.file_id}")
        except Exception as e:
          Logger.log.error(f"Error deleting old file: {e}")

      # Upload new file
      file.stream.seek(0)
      fs = GridFS(get_db())
      file_id = fs.put(
        file.stream,
        filename=file.filename,
        content_type=file.content_type
      )
      update_data["file_id"] = file_id
      update_data["mem_type"] = MemoryType.FILE
      Logger.log.info(f"Uploaded new file: {file_id}")

    # Regenerate embeddings if text changed
    if "text" in update_data or "title" in update_data:
      memory_obj = Memory.objects(id=memory_id).first()
      if not memory_obj:
        raise InvalidId()
      
      text_to_embed = f"{update_data.get('title', memory_obj.title)}\n{update_data.get('text', memory_obj.text)}"
      embeddings = generate_embeddings([text_to_embed])
      update_data["embeddings"] = embeddings

    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()

    # Perform update
    result = Memory.objects(id=memory_id).update_one(**update_data)
    
    if result == 0:
      raise InvalidId()

    # Log audit
    user_token = get_token()
    with Transaction() as (session, db):
      col_audit = db.get_collection(Collections.AUDIT.value)
      audit = audit_collection(
        type=AuditType.UPDATE,
        collection=Collections.MEMORY,
        id=ObjectId(memory_id),
      )
      col_audit.insert_one(audit.to_mongo(), session=session)

    return jsonify({"message": "Memory updated successfully"}), 200

  except InvalidId:
    raise InvalidId()
  except ValidationError as e:
    raise HttpValidationError(e.to_dict())
  except Exception as e:
    Logger.log.error(f"Update error: {e}")
    raise HTTPException(description=str(e))

@memory.route("/create", methods=["POST"])
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def create():
  if not request.content_type or not request.content_type.startswith("multipart/form-data"):
    raise NotAcceptable(description="Content-Type must be multipart/form-data")

  if len(request.files.getlist("file")) > 1:
    raise TooManyFiles()

  try:
    json = {}
    json["title"] = request.form.get("title")
    json["text"] = request.form.get("text")
    json["tags"] = request.form.getlist("tags")
    json["file"] = request.files.get("file")

    body = DCreateMemory(**json) # type: ignore

    if isinstance(body.tags, str):
      body.tags = [] if body.tags == "" else [body.tags]

  except Exception as e:
    Logger.log.error(e)
    raise BadBody(description=get_schema_of_dataclass(DCreateMemory)) # type: ignore

  
  user_token = get_token()
  try:
    with Transaction() as (session, db): # type: ignore
      col_mem = db.get_collection(Collections.MEMORY.value) # type: ignore
      col_audit = db.get_collection(Collections.AUDIT.value) # type: ignore

      create_memory(
        user_token=user_token,
        session=session,
        col_audit=col_audit,
        col_memory=col_mem,
        data=body
      )

  except ValidationError as e:
    raise HttpValidationError(e.to_dict()) # type: ignore
  except Exception as e:
    raise HTTPException(description=str(e))

  return "", 200

@dataclass
class MemoryResult:
  id: str
  title: str
  mem_type: str
  text: str
  file_id: str
  permission: List[str]
  tags: List[str]
  created_at: datetime | None
  updated_at: datetime | None
  deleted_at: datetime | None

@memory.route("/get")
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def get():
  """
  Query Params
    archive - 1 or 0 (default: 0)
    offset - int (default: 0)
    maxItems - int (default: 30)
    asc - 1 or 0 (default: 0) (sorts by updated_at)
  Body (application/json)
    title: str
    mem_type: MemoryType
    tags: List[str]
  """
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  pagination = Pagination(request.args)

  jsonDict = request.get_json(silent=True)
  jsonDict = dict(jsonDict) if jsonDict != None else {}

  title = str(re.escape(jsonDict.get("title", "")))
  tags: List[str] = jsonDict.get("tags")
  mem_type = str(re.escape(jsonDict.get("mem_type", "")))

  filters = []
  if len(title) > 0:
    filters.append(match_regex("title", title))
  if isinstance(tags, list) and len(tags) > 0:
    tags = [ re.escape(i) for i in tags ]
    filters.append(match_list("tags", tags))
  if len(mem_type) > 0:
    filters.append(match_regex("mem_type", mem_type))

  try:
    pipeline = [
      pagination.build_archive_match()
    ]

    count_pipeline = [ i for i in pipeline ]
    count_pipeline.append({
      "$count": "total"
    })

    if len(filters) > 0:
      pipeline.append({
        "$match": {
          "$or": filters
        }
      })

    pipeline.extend(pagination.build_pagination())
    
    # Add projection to convert _id to id string
    pipeline.append({
      "$project": {
        "id": {"$toString": "$_id"},
        "title": 1,
        "text": 1,
        "mem_type": 1,
        "file_id": 1,
        "permission": 1,
        "tags": 1,
        "created_at": 1,
        "updated_at": 1,
        "deleted_at": 1
      }
    })
    
    q_results: List[dict] = list(Memory.objects.aggregate(pipeline))
    results = []
    for doc in q_results:
      results.append(MemoryResult(
        id=doc.get("id", ""),  # Now "id" exists from projection
        title=doc.get("title", ""),
        text=doc.get("text", ""),
        mem_type=doc.get("mem_type", ""),
        file_id=str(doc.get("file_id", "")),
        permission=doc.get("permission", []),
        tags=doc.get("tags", []),
        created_at=doc.get("created_at", None),
        updated_at=doc.get("updated_at", None),
        deleted_at=doc.get("deleted_at", None)
      ))


    count_res = list(Memory.objects.aggregate(count_pipeline))

    return jsonify(PaginationResults(
      total=count_res[0].get("total", len(results)) if len(count_res) > 0 else len(results),
      page=pagination.offset+1,
      items=results
    )), 200
  except ValidationError as e:
    raise HttpValidationError(e.to_dict()) # type: ignore
  except Exception as e:
    raise HTTPException(description=str(e))

@memory.route("/mem-types")
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def get_mem_types():
  values = [e.value for e in MemoryType]
  return jsonify(values), 200