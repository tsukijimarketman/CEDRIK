from functools import wraps
import flask
from flask_jwt_extended import get_jwt
from backend.Apps.Main.Utils.Enum import Role
from backend.Lib.Error import CUnauthorized
from .UserToken import UserToken

def set_token(f):
  @wraps(f)
  def decorator(*args, **kwargs):
    token = get_jwt()
    if len(token) == 0:
        flask.g = None
    else:
        flask.g.user_token = UserToken(token)
    return f(*args, **kwargs)
  return decorator

def protect(role=Role.USER):
  def a(f):
    @wraps(f)
    def decorator(*args, **kwargs):
      token = UserToken()
      if len(get_jwt()) == 0:
        raise CUnauthorized()
      token = UserToken(token)

      match role:
        case Role.ADMIN:
          if not (token.aud == Role.SUPERADMIN.value or token.aud == Role.SUPERADMIN.value):
            raise CUnauthorized()
          pass
        case Role.SUPERADMIN:
          if not token.aud == Role.SUPERADMIN.value:
            raise CUnauthorized()
        case Role.USER:
          pass
        case _:
          raise CUnauthorized()

      return f(*args, **kwargs)
    return decorator
  return a