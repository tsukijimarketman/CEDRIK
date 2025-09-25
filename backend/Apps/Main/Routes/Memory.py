import uuid
from dataclasses import dataclass
from http.client import HTTPException
from flask import jsonify, request
from flask.blueprints import Blueprint
from typing import List
from mongoengine import ValidationError

from backend.Apps.Main.Database import Transaction
from backend.Apps.Main.Utils.Decorator import protect
from backend.Lib.Error import BadBody, HttpValidationError
from backend.Lib.Logger import Logger
from backend.Apps.Main.Service.Memory import create_memory
from backend.Apps.Main.Utils import get_schema_of_dataclass, Collections
from backend.Apps.Main.Utils.Enum import Role
from backend.Lib.Config import RESOURCE_DIR

memory = Blueprint("Memory", __name__)

@dataclass 
class CreateMemoryBody:
  title: str
  content: str
  tags: List[str] | str = ""
  files: List[str] | str = ""

@memory.route("/create", methods=["POST"])
@protect(role=Role.ADMIN)
def create():
  try:
    json = request.get_json()
    body = CreateMemoryBody(**json)
    if isinstance(body.tags, str):
      body.tags = [] if body.tags == "" else [body.tags]

    if isinstance(body.files, str):
      body.files = [] if body.files == "" else [body.files]

  except Exception as e:
    Logger.log.error(e)
    raise BadBody(description=get_schema_of_dataclass(CreateMemoryBody))

  try:
    with Transaction() as (session, db):
      col_mem = db.get_collection(Collections.MEMORY.value)
      col_audit = db.get_collection(Collections.AUDIT.value)

      create_memory(
        session=session,
        col_audit=col_audit,
        col_memory=col_mem,
        data={
          "title": body.title,
          "content": body.content,
          "files": body.files,
          "tags": body.tags
        }
      )

  except ValidationError as e:
    raise HttpValidationError(e.to_dict())
  except Exception as e:
    Logger.log.error(str(e))
    raise HTTPException(description="", code=400)

  return "", 200

@memory.route("/upload", methods=["POST"])
@protect(role=Role.ADMIN)
def upload():
  if "file" in request.files:
    raise BadBody("No `file` key in request body");

  try:
    # Only save one file
    files = request.files.getlist()[0]
    saved = []
    iid = str(uuid.uuid4())
    files.save(f"{RESOURCE_DIR}/{iid}")
    saved.append(iid)
    return jsonify({
      "files": saved
    }), 200

    # files = request.files.getlist()
    # saved = []
    # for f in files:
    #   iid = str(uuid.uuid4())
    #   f.save(f"{RESOURCE_DIR}/{iid}")
    #   saved.append(iid)
    # return jsonify({
    #   "files": saved
    # }), 200
  except Exception as e:
    Logger.log.error(str(e))
    raise HTTPException("Failed to save files")