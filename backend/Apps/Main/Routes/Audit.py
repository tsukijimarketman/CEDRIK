from typing import List
from flask import json, jsonify, request
from flask.blueprints import Blueprint
from bson import json_util
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import BadRequest

from backend.Apps.Main.Utils.Decorator import protect
from backend.Apps.Main.Utils.Enum import AuditType, Role
from backend.Lib.Error import InvalidId
from backend.Apps.Main.Database import Audit
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Logger import Logger

b_audit = Blueprint("Audit", __name__)

@b_audit.route("/get")
@jwt_required(optional=False)
@protect(Role.ADMIN)
def get():
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  archive_param = request.args.get("archive", default="false")
  is_archive = False
  if isinstance(archive_param, str):
    is_archive = archive_param.lower() in ("1", "true", "yes")
  elif isinstance(archive_param, bool):
    is_archive = archive_param

  try:
    audits = []
    audits: List[Audit] = Audit.objects( # type: ignore
      is_active=(not is_archive)
    ).order_by('-created_at')

    results = []

    for audit in audits:
      data_dict = {}
      if hasattr(audit.data, "to_dict"):
          data_dict = audit.data.to_dict() # type: ignore
      else:
          data_dict = json.loads(json_util.dumps(audit.data)) if audit.data else {}
      metadata_dict = {}
      if hasattr(audit.metadata, "to_dict"):
          metadata_dict = audit.metadata.to_dict() # type: ignore
      else:
          metadata_dict = json.loads(json_util.dumps(audit.metadata)) if audit.metadata else {}

      audit_type = audit.type.value if isinstance(audit.type, AuditType) else AuditType(audit.type).value

      results.append(
        {
          "id": str(audit.id),
          "type": audit_type,
          "data": data_dict,
          "metadata": metadata_dict,
          "is_active": audit.is_active,
          "created_at": audit.created_at.isoformat() if getattr(audit, "created_at", None) else None,
          "updated_at": audit.updated_at.isoformat() if getattr(audit, "updated_at", None) else None,
          "deleted_at": audit.deleted_at.isoformat() if getattr(audit, "deleted_at", None) else None
        }
      )


    return jsonify(results), 200
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
