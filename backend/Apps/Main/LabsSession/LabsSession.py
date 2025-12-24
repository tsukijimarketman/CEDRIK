from time import timezone
from backend.Apps.Main.LabsSession.Dataclass import LabsSessionData
from backend.Apps.Main.LabsSession.LabsSessionExtension import KEY
from flask import current_app
from datetime import datetime, timezone
from backend.Lib.Config import LABS_SESSION_EXPIRE_SEC
import uuid

from backend.Apps.Main.LabsSession.LabsSessionService import LabsSessionService
from backend.Lib.Logger import Logger

def create_session(user_id: str) -> LabsSessionData | None:
  service: LabsSessionService = current_app.extensions[KEY]

  sid = str(uuid.uuid4())
  session_info = service.set(sid, {
    "uid": user_id,
    "sid": sid
  });

  return LabsSessionData(
    uid=user_id, sid=sid,
    expiry=datetime.fromisoformat(session_info["exp"])
  )

def get_session(sid: str, refresh: bool = False) -> LabsSessionData | None:
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
    is_refresh = False
    if refresh and (diff.seconds < exp_refresh_threshold):
      is_refresh = True
      Logger.log.info(f"expiry is less than {exp_refresh_threshold} refreshing session")
      session_info =  service.set(sid, {
        "uid": session_info["uid"],
        "sid": sid
      })
    return LabsSessionData(
      uid=session_info["uid"],
      sid=sid,
      expiry=datetime.fromisoformat(session_info["exp"]),
      refresh=is_refresh
    )

  service.delete(sid)
  return None

def remove_session(sid: str):
  service: LabsSessionService = current_app.extensions[KEY]
  service.delete(sid)

