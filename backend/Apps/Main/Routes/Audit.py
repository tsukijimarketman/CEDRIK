from dataclasses import asdict, dataclass
from typing import List
from flask import json, jsonify, request
from flask.blueprints import Blueprint
from bson import json_util
from flask_jwt_extended import jwt_required
from datetime import datetime
from werkzeug.exceptions import BadRequest

from backend.Apps.Main.Database.Models import User
from backend.Apps.Main.Utils.Decorator import protect
from backend.Apps.Main.Utils.Enum import AuditType, Role
from backend.Lib.Config import AI_NAME
from backend.Lib.Error import InvalidId
from backend.Apps.Main.Database import Audit
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Logger import Logger

b_audit = Blueprint("Audit", __name__)

@dataclass
class AuditResult:
  id: str
  type: str
  data: dict
  user: dict
  created_at: datetime | None
  updated_at: datetime | None
  deleted_at: datetime | None

@b_audit.route("/get")
@jwt_required(optional=False)
@protect(Role.ADMIN)
def get():
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  is_archive = request.args.get("archive", default=False, type=str)
  try:
    audits = []
    audits: List[Audit] = Audit.objects( # type: ignore
      is_active=(not is_archive)
    ).order_by('-created_at')

    results: List[AuditResult] = []

    for audit in audits:
      data_dict = {}
      if hasattr(audit.data, "to_dict"):
          data_dict = audit.data.to_dict() # type: ignore
      else:
          data_dict = json.loads(json_util.dumps(audit.data)) if audit.data else {}

      user = None
      if hasattr(audit, "user") and audit.user != None:
        user = User.to_dict_from(audit.user)
      else:
        user = User.to_dict_from({
          "username": AI_NAME,
          "role": Role.ASSISTANT.value
        })

      results.append(
        AuditResult(
          id=str(audit.id), # type: ignore
          type=AuditType(audit.type).value,
          user=user if user else {},
          data=data_dict,
          created_at=audit.created_at, # type: ignore
          updated_at=audit.updated_at, # type: ignore
          deleted_at=None # type: ignore
        )
      )


    return jsonify([ asdict(i) for i in results]), 200
  except Exception as e:
    Logger.log.error(repr(e))
    return BadRequest()

# @b_conversation.route("/get/<id>")
# @jwt_required(optional=False)
# def get_id(id: str):
#   user_id = get_token()
#   if user_id == None:
#     raise InvalidId()

#   try:
#     messages: List[Message] = Message.objects( # type: ignore
#       conversation=id
#     ).only("id", "text", "created_at")

#     results = []
#     for msg in messages:
#       results.append(
#         MessageResult(
#           text=str(msg.text),
#           created_at=msg.created_at # type: ignore
#         )
#       )
#     return jsonify([ asdict(i) for i in results]), 200

#   except Exception as e:
#     Logger.log.error(repr(e))
#     return BadRequest()
