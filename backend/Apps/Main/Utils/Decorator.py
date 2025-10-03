from functools import wraps
import flask
from flask_jwt_extended import get_jwt
from backend.Apps.Main.Utils.Enum import Role
from werkzeug.exceptions import Unauthorized
from backend.Lib.Logger import Logger
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
      jwt = get_jwt()
      token: UserToken = None
      if len(jwt) == 0:
        raise Unauthorized()
      token = UserToken(jwt)

      match role:
        case Role.ADMIN:
          if not (token.aud == Role.SUPERADMIN.value or token.aud == Role.SUPERADMIN.value):
            raise Unauthorized()
          pass
        case Role.SUPERADMIN:
          if not token.aud == Role.SUPERADMIN.value:
            raise Unauthorized()
        case Role.USER:
          pass
        case _:
          raise Unauthorized()

      return f(*args, **kwargs)
    return decorator
  return a