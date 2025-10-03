import uuid
import os
from dataclasses import dataclass
from http.client import HTTPException
from flask import jsonify, request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from typing import List
from mongoengine import ValidationError
from werkzeug.exceptions import NotAcceptable

from backend.Apps.Main.Database import Transaction
from backend.Apps.Main.Utils.Decorator import protect
from backend.Lib.Error import BadBody, HttpValidationError, TooManyFiles
from backend.Lib.Logger import Logger
from backend.Apps.Main.Service.Memory import CreateMemory, create_memory
from backend.Apps.Main.Utils import get_schema_of_dataclass, Collections
from backend.Apps.Main.Utils.Enum import Role
from backend.Lib.Config import RESOURCE_DIR

memory = Blueprint("Memory", __name__)

@memory.route("/create", methods=["POST"])
@jwt_required(optional=False)
@protect(role=Role.ADMIN)
def create():
  if not request.content_type.startswith("multipart/form-data"):
    raise NotAcceptable(description="Content-Type must be multipart/form-data")

  if len(request.files.getlist("file")) > 1:
    raise TooManyFiles()

  try:
    json = {}
    json["title"] = request.form.get("title")
    json["text"] = request.form.get("text")
    json["tags"] = request.form.getlist("tags")
    json["file"] = request.files.get("file")

    body = CreateMemory(**json)

    if isinstance(body.tags, str):
      body.tags = [] if body.tags == "" else [body.tags]

    if isinstance(body.files, str):
      body.files = [] if body.files == "" else [body.files]

  except Exception as e:
    Logger.log.error(e)
    raise BadBody(description=get_schema_of_dataclass(CreateMemory))

  try:
    with Transaction() as (session, db):
      col_mem = db.get_collection(Collections.MEMORY.value)
      col_audit = db.get_collection(Collections.AUDIT.value)

      create_memory(
        session=session,
        col_audit=col_audit,
        col_memory=col_mem,
        data=body
      )

  except ValidationError as e:
    raise HttpValidationError(e.to_dict())
  except Exception as e:
    Logger.log.error(str(e))
    raise HTTPException(description="", code=400)

  return "", 200