from flask import request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required # type: ignore
from mongoengine import ValidationError
from werkzeug.exceptions import NotAcceptable, HTTPException

from backend.Apps.Main.Database import Transaction
from backend.Apps.Main.Utils.Decorator import protect
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Error import BadBody, HttpValidationError, TooManyFiles
from backend.Lib.Logger import Logger
from backend.Apps.Main.Service.Memory import create_memory, DCreateMemory # type: ignore
from backend.Apps.Main.Utils import get_schema_of_dataclass, Collections # type: ignore
from backend.Apps.Main.Utils.Enum import Role

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