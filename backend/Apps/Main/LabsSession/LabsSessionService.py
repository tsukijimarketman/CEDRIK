from redis import Redis
from backend.Lib.Config import REDIS_HOST, REDIS_PORT, LABS_SESSION_EXPIRE_SEC
from datetime import datetime, timedelta, timezone
from typing import Any
from backend.Lib.Logger import Logger
class LabsSessionService:
  con_redis: Redis = None # type: ignore

  def __init__(self):
    # self.service = DefaultFilterService()
    self.con_redis = Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

  def set(self, key: str, value: dict[str, str]) -> dict[str, str]:
    try:
      exp = datetime.now() + timedelta(seconds=LABS_SESSION_EXPIRE_SEC)
      value["exp"] = exp.astimezone(timezone.utc).isoformat()
      value["created_at"] = datetime.now().astimezone(timezone.utc).isoformat()

      _key = f"s:{key}"
      self.con_redis.hset(_key, mapping=value)
      self.con_redis.expireat(_key, exp)
      return value
    except Exception as e:
      Logger.log.error(f"LabsSessionService::set {str(e)}")
    return {}
  
  def get(self, key: str) -> dict[str, str]:
    return self.con_redis.hgetall(f"s:{key}") # type: ignore

  def delete(self, key: str):
    self.con_redis.delete(f"s:{key}")

  def close(self):
    self.con_redis.close();

