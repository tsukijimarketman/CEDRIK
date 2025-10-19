from dataclasses import dataclass
from mongoengine import ValidationError
from flask import request, jsonify
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import InternalServerError, NotAcceptable
from werkzeug.datastructures import FileStorage

import random
from backend.Apps.Main.Database.Models import Audit
from backend.Apps.Main.Filter.Filter import FILTER_ERR_MSG, m_filter
from backend.Apps.Main.Utils.Audit import audit_message
from backend.Apps.Main.Utils.Enum import AuditType
from backend.Lib.Error import BadBody, HttpInvalidId, HttpValidationError, InvalidId, TooManyFiles
from backend.Apps.Main.Database import Transaction
from backend.Lib.Logger import Logger
from backend.Apps.Main.Service.Chat.CreateChat import generate_reply
from backend.Apps.Main.Utils import get_token, Collections
from backend.Apps.Main.Service import create_chat
from backend.Lib.Common import Prompt

ai = Blueprint("Ai", __name__)

@dataclass
class ChatBody:
    conversation: str
    prompt: Prompt
    file: FileStorage | None = None
    def __post_init__(self):
        self.prompt = Prompt(**self.prompt) # type: ignore

@ai.route("/chat", methods=["POST"])
@jwt_required(optional=False)
def chat():
    """
    **Content-Type**
    - `multipart/form-data`

    **Body**
    - conversation  str
    - content       str
    - file          File
    """
    body = None

    if not request.content_type or not request.content_type.startswith("multipart/form-data"):
        raise NotAcceptable(description="Content-Type must be multipart/form-data")
    if len(request.files.getlist("file")) > 1:
        raise TooManyFiles()

    try:
        json = {}
        json["conversation"] = request.form.get("conversation", "")
        json["prompt"] = {
            "role": "user",
            "content": request.form.get("content", "")
        }
        json["file"] = request.files.get("file")

        body = ChatBody(**json)
        body.prompt.role = "user"
    except Exception as _:
        raise BadBody()
    user_token = get_token()
    if (user_token == None): raise HttpInvalidId()

    try:
        audit_message(f"user: {user_token.username}\nquery: \"{body.prompt.content}\"").save()
        # Logger.log.warning(f"Do Filter(Not Implemented Yet)...")
        filter_result = m_filter(body.prompt.content)
        Logger.log.warning(f"FilterResult {filter_result}")
        if filter_result.is_filtered:
            audit_message(f"user: {user_token.username}\nquery: \"{body.prompt.content}\" is filtered", AuditType.FILTERED).save()
            return jsonify({
                "conversation": "",
                "reply": FILTER_ERR_MSG[random.randint(0,len(FILTER_ERR_MSG)-1)]
            }), 200

        # Generate Reply
        # !!! Do not run inside transaction
        Logger.log.warning(f"Finding Related Context...")

        model_reply = generate_reply(
            conversation_id=body.conversation,
            user=user_token,
            prompt=body.prompt
        )
        Logger.log.info(f"Reply {model_reply.reply} {model_reply.embeddings[:5]}")
        # ==============

        with Transaction() as (session, db):
            col_conversation = db.get_collection(Collections.CONVERSATION.value)
            col_message = db.get_collection(Collections.MESSAGE.value)
            col_audit = db.get_collection(Collections.AUDIT.value)

            default_title = body.prompt.content
            if len(default_title) > 20:
                default_title = default_title[:20]

            conv_id = create_chat(
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

            if conv_id != None:
                conv_id = str(conv_id)
            return jsonify({
                "conversation": conv_id,
                "reply": model_reply.reply
            }), 200

    except InvalidId as e:
        raise HttpInvalidId()
    except ValidationError as e:
        raise HttpValidationError(e.to_dict()) # type: ignore
    except Exception as e:
        Logger.log.error(f"{repr(e)} {str(body)}")
        raise InternalServerError()
