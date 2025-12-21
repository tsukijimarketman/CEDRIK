from time import timezone
from backend.Apps.Main.LabsSession.Dataclass import LabsSessionData
from backend.Apps.Main.LabsSession.LabsSessionExtension import KEY
from flask import current_app
from datetime import datetime, timezone
from backend.Lib.Config import LABS_SESSION_EXPIRE_SEC
import uuid

from backend.Apps.Main.LabsSession.LabsSessionService import LabsSessionService

def create_session(user_id: str) -> LabsSessionData | None:
  service: LabsSessionService = current_app.extensions[KEY]

  sid = str(uuid.uuid4())
  session_info = service.set(sid, {
    "uid": user_id,
    "sid": sid
  });

  return LabsSessionData(
    user_id=user_id, session_id=sid,
    expiry=datetime.fromisoformat(session_info["exp"])
  )

def get_and_validate_session(sid: str) -> LabsSessionData | None:
  """
  Validates and removes if the session is not valid
  """
  service: LabsSessionService = current_app.extensions[KEY]
  session_info = service.get(sid)
  if len(session_info) == 0:
    return None

  exp = datetime.fromisoformat(session_info["exp"])
  now = datetime.now().astimezone(timezone.utc)
  if exp > now:
    exp_refresh_threshold = int(LABS_SESSION_EXPIRE_SEC * .1)
    diff = exp-now
    if diff.seconds < exp_refresh_threshold:
      session_info =  service.set(sid, {
        "uid": session_info["uid"],
        "sid": sid
      })
    return LabsSessionData(
      user_id=session_info["uid"],
      session_id=sid,
      expiry=datetime.fromisoformat(session_info["exp"])
    )

  service.delete(sid)
  return None

def remove_session(sid: str):
  service: LabsSessionService = current_app.extensions[KEY]
  service.delete(sid)

