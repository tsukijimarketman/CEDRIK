from dataclasses import dataclass
from mongoengine import ValidationError
from flask import request, jsonify, Response, stream_with_context
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import InternalServerError, NotAcceptable
from werkzeug.datastructures import FileStorage

import random
import json
from backend.Apps.Main.Database.Models import Audit
from backend.Apps.Main.Database.Models import Message, Conversation
from backend.Apps.Main.Utils.UserToken import get_object_id
from backend.Apps.Main.Filter.Filter import FILTER_ERR_MSG, m_filter
from backend.Apps.Main.Utils.Audit import audit_message
from backend.Apps.Main.Utils.Enum import AuditType
from backend.Lib.Error import BadBody, HttpInvalidId, HttpValidationError, InvalidId, TooManyFiles
from backend.Apps.Main.Database import Transaction
from backend.Lib.Sanitizer import contains_html
from backend.Lib.Logger import Logger
# ✅ FIXED: Import both generate_reply and generate_reply_stream
from backend.Apps.Main.Service.Chat.CreateChat import generate_reply, generate_reply_stream
from backend.Apps.Main.Utils import get_token, Collections
from backend.Apps.Main.Service import create_chat
from backend.Lib.Common import Prompt

ai = Blueprint("Ai", __name__)


@dataclass
class ChatBody:
    conversation: str | None
    prompt: Prompt
    file: FileStorage | None = None
    overrides: dict | None = None
    def __post_init__(self):
        self.prompt = Prompt(**self.prompt) # type: ignore

@ai.route("/chat-stream", methods=["POST"])
@jwt_required(optional=False)
def chat_stream():
    '''
    Streaming version of chat endpoint.
    '''
    body = None

    if not request.content_type or not request.content_type.startswith("multipart/form-data"):
        raise NotAcceptable(description="Content-Type must be multipart/form-data")
    if len(request.files.getlist("file")) > 1:
        raise TooManyFiles()
    
    agent = request.form.get("agent", "professor")

    try:
        json_data = {}
        conversation = request.form.get("conversation", "")
        json_data["conversation"] = conversation if conversation and len(conversation.strip()) > 0 else None
        
        json_data["prompt"] = {
            "role": "user",
            "content": request.form.get("content", "")
        }
        json_data["file"] = request.files.get("file")
        json_data["overrides"] = json.loads(request.form.get("overrides", "{}"))

        body = ChatBody(**json_data)
        if body.overrides == None:
            body.overrides = {}
        body.overrides["agent"] = agent
    except Exception as e:
        Logger.log.error(f"Error parsing chat body: {repr(e)}")
        raise BadBody()
    
    user_token = get_token()
    if (user_token == None): 
        raise HttpInvalidId()

    def generate():
        conv_id = body.conversation
        full_reply = ""
        embeddings = []
        ai_message_id = None  # ✅ Track the AI message ID
        
        try:
            audit_message(f"user: {user_token.username}\nquery: \"{body.prompt.content}\"").save()
            if contains_html(body.prompt.content):
                yield f"data: {json.dumps({'type': 'error', 'content': "BadBody"})}\n\n"
                return

            # Filter check
            filter_result = m_filter(body.prompt.content)
            Logger.log.warning(f"FilterResult {filter_result}")
            
            if filter_result.is_filtered:
                audit_message(f"user: {user_token.username}\nquery: \"{body.prompt.content}\" is filtered", AuditType.FILTERED).save()
                error_msg = FILTER_ERR_MSG[random.randint(0, len(FILTER_ERR_MSG)-1)]
                yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
                return

            Logger.log.warning(f"Finding Related Context...")
            
            # Stream the reply
            for item in generate_reply_stream(
                conversation_id=body.conversation,
                user=user_token,
                prompt=body.prompt,
                overrides=body.overrides
            ):
                try:
                    if isinstance(item, dict):
                        # This is the final metadata chunk
                        embeddings = item.get("embeddings", [])
                        full_reply = item.get("full_reply", full_reply)
                    else:
                        # This is a text chunk
                        full_reply += item
                        yield f"data: {json.dumps({'type': 'content', 'content': item})}\n\n"
                except GeneratorExit:
                    Logger.log.warning("Client disconnected - stopping generation")
                    return
            
            # Save to database after streaming is complete
            with Transaction() as (session, db):
                col_conversation = db.get_collection(Collections.CONVERSATION.value)
                col_message = db.get_collection(Collections.MESSAGE.value)
                col_audit = db.get_collection(Collections.AUDIT.value)

                default_title = body.prompt.content
                if len(default_title) > 20:
                    default_title = default_title[:20]

                # Create Reply object for database storage
                from backend.Apps.Main.Utils.LLM import Reply
                model_reply = Reply(
                    reply=full_reply,
                    embeddings=embeddings,
                    prompt=body.prompt
                )

                # ✅ Get all three IDs from create_chat
                result = create_chat(
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
                
                # ✅ Unpack the tuple
                conv_id, user_message_id, ai_message_id = result

                if conv_id != None:
                    conv_id = str(conv_id)
                if ai_message_id != None:
                    ai_message_id = str(ai_message_id)
            
            # ✅ Send completion with both conversation ID and AI message ID
            yield f"data: {json.dumps({'type': 'done', 'conversation': conv_id, 'ai_message_id': ai_message_id})}\n\n"
            
        except Exception as e:
            Logger.log.error(f"Streaming error: {repr(e)}")
            import traceback
            Logger.log.error(traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )

@ai.route("/truncate-message", methods=["POST"])
@jwt_required(optional=False)
def truncate_message():
    """
    Truncate a message to its currently displayed length when generation is stopped.
    This allows the stopped state to persist across devices.
    """
    try:
        data = request.get_json()
        message_id = data.get("message_id")
        truncated_content = data.get("content")
        
        Logger.log.info(f"🛑 Truncate request: message_id={message_id}, content_length={len(truncated_content) if truncated_content else 0}")
        
        if not message_id or truncated_content is None:
            Logger.log.error("Missing message_id or content")
            raise BadBody()
        
        user_token = get_token()
        if user_token is None:
            Logger.log.error("No user token")
            raise HttpInvalidId()
        
        Logger.log.info(f"👤 User: {user_token.username} ({user_token.id})")
        
        # Get the message object ID
        try:
            msg_obj_id = get_object_id(message_id)
            Logger.log.info(f"📝 Message ObjectId: {msg_obj_id}")
        except Exception as e:
            Logger.log.error(f"Invalid message ID: {e}")
            return jsonify({"error": "Invalid message ID"}), 400
        
        # Find the message
        message = Message.objects(id=msg_obj_id).first()
        
        if not message:
            Logger.log.error(f"Message not found: {msg_obj_id}")
            return jsonify({"error": "Message not found"}), 404
        
        Logger.log.info(f"✅ Message found, conversation: {message.conversation}")

# ✅ FIX: message.conversation is already a Conversation object (ReferenceField)
        conversation = message.conversation
        if not conversation:
           Logger.log.error(f"Conversation not found")
           return jsonify({"error": "Conversation not found"}), 404

# ✅ FIX: Access the .id attribute of the User objects
        conversation_owner_id = str(conversation.owner.id)
        user_id = str(user_token.id)

        Logger.log.info(f"🔐 Authorization check: owner={conversation_owner_id}, user={user_id}")

        if conversation_owner_id != user_id:
          Logger.log.error(f"Unauthorized: user {user_id} tried to modify conversation owned by {conversation_owner_id}")
          return jsonify({"error": "Unauthorized"}), 403
        
        # Update the message content
        Logger.log.info(f"✂️ Truncating from {len(message.text)} to {len(truncated_content)} chars")
        message.text = truncated_content
        message.save()
        
        Logger.log.info(f"✅ Truncated message {message_id} successfully")
        
        # Audit log
        audit_message(
            f"user: {user_token.username}\ntruncated message: {message_id} to {len(truncated_content)} chars",
            AuditType.UPDATE
        ).save()
        
        return jsonify({
            "success": True,
            "message_id": message_id,
            "content_length": len(truncated_content)
        }), 200
        
    except Exception as e:
        Logger.log.error(f"❌ Error truncating message: {repr(e)}")
        import traceback
        Logger.log.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

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
    agent = request.form.get("agent", "professor")

    try:
        json_dict = {}
        # FIX: Handle empty conversation as None
        conversation = request.form.get("conversation", "")
        json_dict["conversation"] = conversation if conversation and len(conversation.strip()) > 0 else None
        
        json_dict["prompt"] = {
            "role": "user",
            "content": request.form.get("content", "")
        }
        # TODO handle file
        json_dict["file"] = request.files.get("file")
        json_dict["overrides"] = json.loads(request.form.get("overrides", "{}"))

        body = ChatBody(**json_dict)
        if body.overrides == None:
            body.overrides = {}
        body.overrides["agent"] = agent
    except Exception as e:
        Logger.log.error(f"Error parsing chat body: {repr(e)}")
        raise BadBody()
    
    user_token = get_token()
    if (user_token == None): 
        raise HttpInvalidId()
    
    try:
        audit_message(f"user: {user_token.username}\nquery: \"{body.prompt.content}\"").save()
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
            prompt=body.prompt,
            overrides=body.overrides
        )
        Logger.log.info(f"Reply {model_reply.reply} {model_reply.embeddings[:5]}")

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
