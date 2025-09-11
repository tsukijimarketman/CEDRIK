from functools import wraps
import flask
from flask_jwt_extended import get_jwt
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