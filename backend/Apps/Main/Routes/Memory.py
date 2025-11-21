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
from backend.Apps.Main.Utils.Audit import audit_collection

memory = Blueprint("Memory", __name__)

@memory.route("/delete/<memory_id>", methods=["DELETE"])
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def delete(memory_id):
  """
  Soft delete a memory by ID
  If memory is a file type, deletes ALL chunks with the same file_id
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

      # Determine if this is a file memory with chunks
      if memory_obj.file_id:
        # This is a file memory - delete ALL chunks with this file_id
        file_id = memory_obj.file_id
        
        # Get all memory chunks with this file_id
        all_chunks = Memory.objects(file_id=file_id)
        chunk_ids = [chunk.id for chunk in all_chunks]
        
        # Delete the file from GridFS
        fs = GridFS(get_db())
        try:
          fs.delete(file_id)
          Logger.log.info(f"Deleted file from GridFS: {file_id}")
        except Exception as e:
          Logger.log.error(f"Error deleting file: {e}")

        # Soft delete ALL chunks
        result = Memory.objects(file_id=file_id).update(
          deleted_at=datetime.utcnow()
        )
        
        Logger.log.info(f"Soft deleted {result} memory chunks for file_id: {file_id}")

        # Log audit for all chunks
        for chunk_id in chunk_ids:
          audit = audit_collection(
            type=AuditType.DELETE,
            collection=Collections.MEMORY,
            id=chunk_id,
          )
          col_audit.insert_one(audit.to_mongo(), session=session)
          
      else:
        # This is a text-only memory - delete single item
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
  For file memories, updates ALL chunks with the same file_id
  For text memories, updates the single memory
  """
  if not request.content_type or not request.content_type.startswith("multipart/form-data"):
    raise NotAcceptable(description="Content-Type must be multipart/form-data")

  # Validate memory_id
  if not ObjectId.is_valid(memory_id):
    raise InvalidId()

  try:
    update_data = {}
    
    # Get existing memory to check type
    existing_memory = Memory.objects(id=memory_id).first()
    if not existing_memory:
      raise InvalidId()
    
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
      if existing_memory.file_id:
        fs = GridFS(get_db())
        try:
          fs.delete(existing_memory.file_id)
          Logger.log.info(f"Deleted old file: {existing_memory.file_id}")
        except Exception as e:
          Logger.log.error(f"Error deleting old file: {e}")
        
        # Delete old chunks
        Memory.objects(file_id=existing_memory.file_id).delete()
        Logger.log.info(f"Deleted old memory chunks for file_id: {existing_memory.file_id}")

      # Upload new file and create new chunks
      # This should use the create_memory function to handle chunking
      # For now, we'll just upload the file
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

    # Regenerate embeddings if text changed (for text-only memories)
    if "text" in update_data or "title" in update_data:
      if not existing_memory.file_id:  # Only for text memories
        text_to_embed = f"{update_data.get('title', existing_memory.title)}\n{update_data.get('text', existing_memory.text)}"
        embeddings = generate_embeddings([text_to_embed])
        update_data["embeddings"] = embeddings

    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()

    # Perform update based on memory type
    if existing_memory.file_id and not file:
      # File memory without new file - update ALL chunks
      result = Memory.objects(file_id=existing_memory.file_id).update(
        **update_data
      )
      Logger.log.info(f"Updated {result} memory chunks for file_id: {existing_memory.file_id}")
    else:
      # Text memory or file replacement - update single memory
      result = Memory.objects(id=memory_id).update_one(**update_data)
      
      if result == 0:
        raise InvalidId()

    # Log audit
    user_token = get_token()
    with Transaction() as (session, db):
      col_audit = db.get_collection(Collections.AUDIT.value)
      
      if existing_memory.file_id:
        # Log audit for all chunks
        chunks = Memory.objects(file_id=existing_memory.file_id)
        for chunk in chunks:
          audit = audit_collection(
            type=AuditType.UPDATE,
            collection=Collections.MEMORY,
            id=chunk.id,
          )
          col_audit.insert_one(audit.to_mongo(), session=session)
      else:
        # Log audit for single memory
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
  tags: List[str] = jsonDict.get("tags") # type: ignore
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

    # CRITICAL FIX: Add a unique grouping field BEFORE the $group stage
    # This ensures text memories (no file_id) each get a unique group identifier
    pipeline.append({
      "$addFields": {
        "grouping_id": {
          "$cond": [
            # If file_id exists and is valid
            {"$and": [
              {"$ne": ["$file_id", None]},
              {"$ne": ["$file_id", ""]},
              {"$ifNull": ["$file_id", False]}
            ]},
            "$file_id",  # Use file_id for grouping (chunks merge)
            "$_id"       # Use unique _id for grouping (stays separate)
          ]
        }
      }
    })
    
    # Now group by the grouping_id field
    pipeline.append({
      "$group": {
        "_id": "$grouping_id",  # Group by our custom field
        "doc_id": {"$first": "$_id"},
        "title": {"$first": "$title"},
        "text": {"$push": "$text"},
        "mem_type": {"$first": "$mem_type"},
        "file_id": {"$first": "$file_id"},
        "permission": {"$first": "$permission"},
        "tags": {"$push": "$tags"},
        "created_at": {"$min": "$created_at"},
        "updated_at": {"$max": "$updated_at"},
        "deleted_at": {"$first": "$deleted_at"},
        "chunk_count": {"$sum": 1}  # Count how many chunks were grouped
      }
    })

    # Flatten arrays
    pipeline.append({
      "$addFields": {
        "tags": {
          "$reduce": {
            "input": "$tags",
            "initialValue": [],
            "in": {"$setUnion": ["$$value", "$$this"]}
          }
        },
        "text": {
          "$trim": {
            "input": {
              "$reduce": {
                "input": "$text",
                "initialValue": "",
                "in": {
                  "$cond": {
                    "if": {"$eq": ["$$value", ""]},
                    "then": "$$this",
                    "else": {"$concat": ["$$value", "\n", "$$this"]}
                  }
                }
              }
            }
          }
        }
      }
    })

    # Add a readable ID field
    pipeline.append({
      "$addFields": {
        "id": {"$toString": "$doc_id"}
      }
    })

    pipeline.extend(pagination.build_pagination())
    
    q_results: List[dict] = list(Memory.objects.aggregate(pipeline))
    
    # DEBUG: Log to see what we're getting
    Logger.log.info(f"Query returned {len(q_results)} grouped results")
    for result in q_results[:3]:  # Log first 3
      Logger.log.info(f"Result: id={result.get('id')}, title={result.get('title')}, chunk_count={result.get('chunk_count')}, has_file={bool(result.get('file_id'))}")
    
    results = []
    for doc in q_results:
      results.append(MemoryResult(
        id=doc.get("id", ""),
        title=doc.get("title", ""),
        text=doc.get("text", ""),
        mem_type=doc.get("mem_type", ""),
        file_id=str(doc.get("file_id", "")) if doc.get("file_id") else "",
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
    raise HttpValidationError(e.to_dict())
  except Exception as e:
    Logger.log.error(f"Get error: {e}")
    raise HTTPException(description=str(e))

@memory.route("/mem-types")
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def get_mem_types():
  values = [e.value for e in MemoryType]
  return jsonify(values), 200