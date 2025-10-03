from flask import jsonify
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import Unauthorized

from backend.Lib.Error import InvalidId
from backend.Apps.Main.Database import Conversation
from backend.Apps.Main.Utils.Decorator import protect
from backend.Apps.Main.Utils.UserToken import get_object_id, get_token

conversation = Blueprint("Conversation", __name__)

@conversation.route("/")
@jwt_required()
@protect()
def get():
  if len(user_id) == 0:
    raise InvalidId()

  token = get_token()
  if token == None:
    raise Unauthorized()

  user_id = get_object_id(token.id)
  conversations = Conversation.objects(owner=user_id)

  return jsonify(conversations), 200