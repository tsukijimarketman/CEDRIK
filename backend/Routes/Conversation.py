from flask import jsonify
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required

from backend.Error import CUnauthorized, InvalidId
from backend.Database import Conversation
from backend.Utils.Decorator import protect
from backend.Utils.UserToken import get_object_id, get_token

conversation = Blueprint("Conversation", __name__)

@conversation.route("/")
@jwt_required()
@protect()
def get():
  if len(user_id) == 0:
    raise InvalidId()

  token = get_token()
  if token == None:
    raise CUnauthorized()

  user_id = get_object_id(token.id)
  conversations = Conversation.objects(owner=user_id)

  return jsonify(conversations), 200