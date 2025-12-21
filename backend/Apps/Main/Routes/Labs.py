from dataclasses import asdict, dataclass
from flask import jsonify, request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from datetime import timezone

from werkzeug.exceptions import Unauthorized
from backend.Apps.Main.Database.Models.User import User
from backend.Apps.Main.LabsSession.LabsSession import create_session, get_session, remove_session

from backend.Lib.Error import CouldNotCreateSession, InvalidId, InvalidSession
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Logger import Logger
from backend.Apps.Main.Utils.Audit import audit_message

b_labs = Blueprint("Labs", __name__)

@dataclass
class SessionCreateResult:
  uid: str
  sid: str
  expiry: str

@dataclass
class SessionGetResult:
  uid: str
  sid: str
  expiry: str
  refresh: bool

@b_labs.route("/session/create", methods=["POST"])
@jwt_required(optional=False)
def create():
  user_id = get_token()
  if user_id == None or user_id.id == None:
    raise InvalidId()

  audit_message(f"user: {user_id.username} is trying to create a labs session").save()

  session = create_session(user_id.id)
  if session == None:
    raise CouldNotCreateSession()

  audit_message(f"user: {user_id.username} successfully created a labs session").save()

  return jsonify(
    asdict(
      SessionCreateResult(
        uid=session.user_id,
        sid=session.session_id,
        expiry=session.expiry.astimezone(timezone.utc).isoformat()
      )
    )
  ), 200


@b_labs.route("/session/verify")
def verify():
  args = request.args
  sid: str | None = args.get("sid", None)
  if sid == None:
    raise InvalidSession()

  session = get_session(sid, True)
  if session == None:
    raise Unauthorized()

  if session.refresh:
    audit_message(f"user: {session.user_id} refreshed the labs session").save()

  return "", 200

@b_labs.route("/session/get")
def get():
  args = request.args
  sid: str | None = args.get("sid", None)
  if sid == None:
    raise InvalidSession()

  session = get_session(sid)
  if session == None:
    raise Unauthorized()

  return jsonify(SessionGetResult(
    uid=session.user_id,
    sid=session.session_id,
    expiry=session.expiry.astimezone(timezone.utc).isoformat(),
    refresh=session.refresh
  )), 200

@b_labs.route("/session/delete", methods=["DELETE"])
def delete():
  args = request.args
  sid: str | None = args.get("sid", None)
  if sid == None:
    raise InvalidSession()

  remove_session(sid)
  return "", 200
