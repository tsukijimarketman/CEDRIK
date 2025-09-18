from dataclasses import dataclass
from flask import request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from typing import List

from backend.Error import BadBody
from backend.Logger import Logger
from backend.Utils import set_token
from backend.Utils.Enum import MemoryType

memory = Blueprint("Memory", __name__)

@dataclass 
class CreateBody:
  content: str | List[int]
  mem_type: str = MemoryType.TEXT.value

@memory.route("/create", methods=["POST"])
@jwt_required(optional=False)
@set_token
def create():
  try:
    json = request.get_json()
    body = CreateBody(**json)
  except Exception as e:
    Logger.log.error(e)
    raise BadBody()