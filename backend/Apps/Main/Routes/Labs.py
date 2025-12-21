from dataclasses import asdict, dataclass
from typing import List
from flask import jsonify, request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from datetime import datetime
from werkzeug.exceptions import BadRequest

from backend.Lib.Error import InvalidId
from backend.Apps.Main.Database import Conversation, Message
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Logger import Logger

b_labs = Blueprint("Labs", __name__)

@dataclass
class SessionCreateResult:
  id: str
  expiry: datetime

@b_labs.route("/session/create")
@jwt_required(optional=False)
def create_session():
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  pass
