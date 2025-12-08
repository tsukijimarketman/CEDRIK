from datetime import timezone
import re
from pymongo.synchronous.command_cursor import CommandCursor
from mongoengine.queryset.visitor import Q
from dataclasses import asdict, dataclass
from typing import List, Any
from flask import json, jsonify, request
from flask.blueprints import Blueprint
from bson import json_util
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import BadRequest

from backend.Apps.Main.Database.Models import User
from backend.Apps.Main.Utils.Aggregate import Pagination, PaginationResults, match_exists, match_regex
from backend.Apps.Main.Utils.Decorator import protect
from backend.Apps.Main.Utils.Enum import AuditType, Collections, Role
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
  created_at: str | None
  updated_at: str | None
  deleted_at: str | None

@b_audit.route("/get")
@jwt_required(optional=False)
@protect(Role.ADMIN)
def get():
  """
  Query Params
    archive    - 1 or 0 (default: 0)
    offset     - int (default: 0)
    maxItems   - int (default: 30)
    sort       - <field_name>-<asc|desc>
    username   - str
    type       - str
    ip         - str
  """
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  pagination = Pagination(request.args) # type: ignore

  args = request.args
  name = str(re.escape(args.get("username", "")))
  _type = args.get("type", "")
  ip = str(re.escape(args.get("ip", "")))

  filters = []
  if len(_type) > 0:
    filters.append(match_regex("type", _type))
    filters.append({
      "type": {
        '$regex': _type,
        '$options': 'i'
      }
    })
  if len(ip) > 0:
    filters.append(match_regex("data.ip", ip))
  if len(name) > 0:
    if name.lower() == AI_NAME.lower():
      filters.append(match_exists("user", False))
    else:
      v = match_regex("user.username", name)
      v["user.username"]["$exists"] = True # type: ignore
      filters.append(v)

  try:
    pagination.pipeline = [
      {
        '$lookup': {
          'from': Collections.USER.value,
          'localField': 'user', 
          'foreignField': '_id', 
          'as': 'user'
        }
      },
      {
        '$unwind': {
          'path': '$user', 
          'preserveNullAndEmptyArrays': True
        }
      }
    ]
    if len(filters) > 0:
      pagination.pipeline.append({
        "$match": {
          "$or": filters
        }
      })

    pagination.set_offset_for_last_page(Audit)
    cmd_cursor: CommandCursor = Audit.objects.aggregate(pagination.build_pipeline()) # type: ignore
    cmd_cursor_list = cmd_cursor.to_list(1)
    aggregation: dict[str, Any] = cmd_cursor_list[0] if len(cmd_cursor_list) > 0 else {}
    audits: List[dict] = list(
      aggregation.get("items", [])
    )
    results = []

    for audit in audits:
      data_dict = audit.get("data", {})
      data_id = data_dict.get("id", "")
      if not isinstance(data_id, str):
        data_dict["id"] = str(data_id)

      user = audit.get("user", None)
      if user != None:
        user = User.to_dict_from(user)
      else:
        user = User.to_dict_from({
          "username": AI_NAME,
          "role": Role.ASSISTANT.value
        })

      results.append(
        AuditResult(
          id=str(audit.get("_id", "")), # type: ignore
          type=AuditType(audit["type"]).value if audit.get("type", None) != None else AuditType.MESSAGE.value,
          user=user if user else {},
          data=data_dict,
          created_at=audit.get("created_at").astimezone(timezone.utc).isoformat() if audit.get("created_at", None) != None else None, # type: ignore
          updated_at=audit.get("updated_at").astimezone(timezone.utc).isoformat() if audit.get("updated_at", None) != None else None, # type: ignore
          deleted_at=audit.get("deleted_at").astimezone(timezone.utc).isoformat() if audit.get("deleted_at", None) != None else None # type: ignore
        )
      )

    return jsonify(PaginationResults(
      total=int(aggregation.get("total", 0)),
      page=pagination.offset + 1,
      items=[ asdict(i) for i in results]
    )), 200
  except Exception as e:
    # Logger.log.error(repr(e), traceback.format_exc())
    Logger.log.error(repr(e))
    return BadRequest()

@b_audit.route("/types")
@jwt_required(optional=False)
@protect(Role.ADMIN)
def get_audit_types():
  values = [e.value for e in AuditType]
  return jsonify(values), 200
