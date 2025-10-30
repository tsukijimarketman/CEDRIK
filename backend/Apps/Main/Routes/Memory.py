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

from backend.Apps.Main.Database import Transaction
from backend.Apps.Main.Database.Models import Memory
from backend.Apps.Main.Utils.Aggregate import Pagination, PaginationResults, match_list, match_regex
from backend.Apps.Main.Utils.Decorator import protect
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Error import BadBody, HttpValidationError, InvalidId, TooManyFiles
from backend.Lib.Logger import Logger
from backend.Apps.Main.Service.Memory import create_memory, DCreateMemory # type: ignore
from backend.Apps.Main.Utils import get_schema_of_dataclass, Collections # type: ignore
from backend.Apps.Main.Utils.Enum import MemoryType, Role

memory = Blueprint("Memory", __name__)

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
    refer to Pagination
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
  tags: List[str] = jsonDict.get("tags", [])
  mem_type = str(re.escape(jsonDict.get("mem_type", "")))

  if len(title) > 0:
    pagination.filters.append(match_regex("title", title))
  if isinstance(tags, list) and len(tags) > 0:
    tags = [ re.escape(i) for i in tags ]
    pagination.filters.append(match_list("tags", tags))
  if len(mem_type) > 0:
    pagination.filters.append(match_regex("mem_type", mem_type))

  try:
    q_results: List[dict] = list(Memory.objects.aggregate(pagination.build())) # type: ignore
    results = []
    for doc in q_results:
      results.append(MemoryResult(
        id=doc.get("id", ""),
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

    return jsonify(PaginationResults(
      total = q_results[0].get("total", len(q_results)) if len(q_results) > 0 else len(q_results),
      page=pagination.page,
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