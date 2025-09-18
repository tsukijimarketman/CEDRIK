from dataclasses import dataclass
from http.client import HTTPException
from flask import request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from typing import List
from mongoengine import ValidationError

from backend.Database import Transaction, Memory, Audit
from backend.Database.Models.Audit import AuditData
from backend.Error import BadBody, HttpValidationError
from backend.LLM import generate_embeddings
from backend.Logger import Logger
from backend.Service.Memory import create_text_memory
from backend.Utils import get_schema_of_dataclass, Collections, MemoryType, Role
from backend.Utils.Enum import AuditAction, Permission

memory = Blueprint("Memory", __name__)

@dataclass 
class CreateTextMemoryBody:
  title: str
  content: str
  tags: List[str] = ""

@memory.route("/create", methods=["POST"])
def create():
  try:
    json = request.get_json()
    body = CreateTextMemoryBody(**json)
  except Exception as e:
    Logger.log.error(e)
    raise BadBody(description=get_schema_of_dataclass(CreateTextMemoryBody))

  try:
    with Transaction() as (session, db):
      col_mem = db.get_collection(Collections.MEMORY.value)
      col_audit = db.get_collection(Collections.AUDIT.value)

      create_text_memory(
        session=session,
        col_audit=col_audit,
        col_memory=col_mem,
        data={
          "title": body.title,
          "content": body.content,
          "tags": body.tags
        }
      )
  except ValidationError as e:
    raise HttpValidationError(e.to_dict())
  except Exception as e:
    Logger.log.error(str(e))
    raise HTTPException(description="", code=400)

  return "", 200