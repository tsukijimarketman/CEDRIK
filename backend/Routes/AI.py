from dataclasses import dataclass
from mongoengine import ValidationError
from flask import request, jsonify, g as flaskg
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import InternalServerError

from backend.Error import BadBody, HttpInvalidId, HttpValidationError, InvalidId
from backend.LLM import Prompt, IModel
from backend.Database import Transaction
from backend.Logger import Logger
from backend.Utils import get_token, Collections
from backend.Service import create_chat

ai = Blueprint("Ai", __name__)

@dataclass
class ChatBody:
    conversation: str | None
    prompt: Prompt
    def __post_init__(self):
        self.prompt = Prompt(**self.prompt)

@ai.route("/chat", methods=["POST"])
@jwt_required(optional=True)
def chat():
    body = None
    try:
        body = request.get_json()
        body = ChatBody(**body)
        body.prompt.role = "user" # force user role for testing
    except Exception as _:
        raise BadBody()
    user_token = get_token()

    Logger.log.info(f"chat::prompt {body}")

    try:
        Logger.log.warning(f"Do Filter(Not Implemented Yet)...")
        Logger.log.warning(f"Do Find Related Context(Not Implemented Yet)...")

        interface = IModel(body.prompt)
        model_reply = interface.generate_reply()
        model_reply.decoded = model_reply.decoded.replace(body.prompt.content, "", 1).strip()
        Logger.log.info(f"ModelReply {model_reply.decoded} {model_reply.embeddings[:5]}")

        with Transaction() as (session, db):
            col_conversation = db.get_collection(Collections.CONVERSATION.value)
            col_message = db.get_collection(Collections.MESSAGE.value)
            col_audit = db.get_collection(Collections.AUDIT.value)

            default_title = body.prompt.content
            if len(default_title) > 10:
                default_title = default_title[:10]

            create_chat(
                session,
                col_audit,
                col_conversation,
                col_message,
                model_reply,
                default_title,
                body.conversation,
                body.prompt,
                user_token
            )

    except InvalidId as e:
        raise HttpInvalidId()
    except ValidationError as e:
        raise HttpValidationError(e.to_dict())
    except Exception as e:
        Logger.log.error(f"{str(e)} {str(body)}")
        raise InternalServerError()

    return jsonify({
        "reply": model_reply.decoded
    }), 200