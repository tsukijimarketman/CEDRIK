from backend.Logger import Logger
import flask
from flask import request, jsonify
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required, get_jwt

from backend.Error import BadBody
from backend.LLM import Prompt, IModel
from backend.Utils import UserToken, set_token

ai = Blueprint("Ai", __name__)

@ai.route("/test-chat", methods=["POST"])
@jwt_required(optional=True)
@set_token
def tchat():
    body = None
    try:
        body = request.get_json()
        body = Prompt(**body)
        body.role = "user" # force user role for testing
    except Exception as _:
        raise BadBody()

    # user_token = None
    # if hasattr(flask.g, "user_token"):
    #     user_token = UserToken(flask.g.user_token)

    Logger.log.info(f"tchat::prompt {body}")

    interface = IModel(body)
    decoded, inp, out = interface.generate_reply()

    Logger.log.info(f"output {decoded.strip()}")

    return jsonify({
        "output": decoded.strip(),
    }), 200