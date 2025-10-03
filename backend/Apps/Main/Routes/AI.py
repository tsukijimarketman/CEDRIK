from dataclasses import dataclass
from mongoengine import ValidationError
from flask import request, jsonify
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import InternalServerError

from backend.Lib.Error import BadBody, HttpInvalidId, HttpValidationError, InvalidId
from backend.Apps.Main.Database import Transaction
from backend.Lib.Logger import Logger
from backend.Apps.Main.Service.Chat.CreateChat import generate_reply
from backend.Apps.Main.Utils import get_token, Collections
from backend.Apps.Main.Service import create_chat
from backend.Lib.Common import Prompt

ai = Blueprint("Ai", __name__)

@dataclass
class ChatBody:
    conversation: str | None
    prompt: Prompt
    def __post_init__(self):
        self.prompt = Prompt(**self.prompt) # type: ignore

@ai.route("/chat", methods=["POST"])
@jwt_required(optional=False)
def chat():
    body = None
    try:
        body = request.get_json()
        body = ChatBody(**body)
        body.prompt.role = "user" # force user role for testing
        if body.conversation == None:
            body.conversation = ""
    except Exception as _:
        raise BadBody()
    user_token = get_token()

    assert(user_token != None)

    Logger.log.info(f"chat::prompt {body}")

    try:
        Logger.log.warning(f"Do Filter(Not Implemented Yet)...")

        # Generate Reply
        # !!! Do not run inside transaction
        Logger.log.warning(f"Finding Related Context...")
        model_reply = generate_reply(
            conversation_id=body.conversation,
            user=user_token,
            prompt=body.prompt
        )
        Logger.log.info(f"ModelReply {model_reply.reply} {model_reply.embeddings[:5]}")
        # ==============

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
        Logger.log.error(f"{repr(e)} {str(body)}")
        raise InternalServerError()

    return jsonify({
        "reply": model_reply.reply
    }), 200