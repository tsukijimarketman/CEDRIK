from backend.Logger import Logger
import flask
from flask import request, jsonify
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required, get_jwt
from dataclasses import dataclass

from backend.Error import BadBody
from backend.LLM import Prompt, IModel
from backend.Utils import UserToken

ai = Blueprint("Ai", __name__)

@ai.before_request
@jwt_required(optional=True)
def set_jwt_optional():
    token = get_jwt()
    if len(token) == 0:
        flask.g = None
    else:
        flask.g.user_token = UserToken(token)

@ai.route("/test-chat", methods=["POST"])
def tchat():
    body = None
    try:
        body = request.get_json()
        body = Prompt(**body)
    except Exception as _:
        raise BadBody()

    user_token = None
    if hasattr(flask.g, "user_token"):
        user_token = UserToken(flask.g.user_token)

    Logger.log.info(f"tchat::prompt {body}")

    interface = IModel(body)
    decoded, inp, out = interface.generate_reply()

    Logger.log.info(f"output {decoded.strip()}")

    return jsonify({
        "output": decoded.strip(),
    }), 200