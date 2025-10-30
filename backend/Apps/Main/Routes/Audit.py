from datetime import datetime
import re
import traceback
from mongoengine.queryset.visitor import Q
from dataclasses import asdict, dataclass
from typing import List
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
  created_at: datetime | None
  updated_at: datetime | None
  deleted_at: datetime | None

@b_audit.route("/get")
@jwt_required(optional=False)
@protect(Role.ADMIN)
def get():
  """
  Query Params
    refer to Pagination
  Body (application/json)
    username: str
    type: str
    ip: str
  """
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  pagination = Pagination(request.args)

  jsonDict = request.get_json(silent=True)
  jsonDict = dict(jsonDict) if jsonDict != None else {}
  name = str(re.escape(jsonDict.get("username", "")))
  _type = jsonDict.get("type", "")
  ip = str(re.escape(jsonDict.get("ip", "")))

  if len(_type) > 0:
    pagination.filters.append(match_regex("type", _type))
    # pagination.filters.append({
    #   "type": {
    #     '$regex': _type, 
    #     '$options': 'i'
    #   }
    # })
  if len(ip) > 0:
    pagination.filters.append(match_regex("data.ip", ip))
  if len(name) > 0:
    if name.lower() == AI_NAME.lower():
      pagination.filters.append(match_exists("user", False))
    else:
      v = match_regex("user.username", name)
      v["user.username"]["$exists"] = True # type: ignore
      pagination.filters.append(v)

  try:
    audits = []
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

    audits: List[dict] = list(Audit.objects.aggregate(pagination.build())) # type: ignore

    results = []

    # Mapping
    for audit in audits:
      # Logger.log.info(audit)

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
          id=str(audit.get(id, "")), # type: ignore
          type=AuditType(audit["type"]).value if audit.get("type", None) != None else AuditType.MESSAGE.value,
          user=user if user else {},
          data=data_dict,
          created_at=audit.get("created_at", None), # type: ignore
          updated_at=audit.get("updated_at", None), # type: ignore
          deleted_at=audit.get("deleted_at", None), # type: ignore
        )
      )

    total = audits[0].get("total", len(audits)) if len(audits) > 0 else len(audits)

    return jsonify(PaginationResults(
      total=total,
      page=pagination.page,
      items=[ asdict(i) for i in results]
    )), 200
  except Exception as e:
    # Logger.log.error(repr(e), traceback.format_exc())
    Logger.log.error(repr(e))
    raise BadRequest()

@b_audit.route("/types")
@jwt_required(optional=False)
@protect(Role.ADMIN)
def get_audit_types():
  values = [e.value for e in AuditType]
  return jsonify(values), 200
