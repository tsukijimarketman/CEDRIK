from dataclasses import asdict, dataclass
from typing import List
from flask import jsonify, request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from datetime import datetime
from werkzeug.exceptions import BadRequest

from backend.Lib.Error import InvalidId
from backend.Apps.Main.Database import Conversation, Message
from backend.Apps.Main.Utils.UserToken import get_token
from backend.Lib.Logger import Logger
from backend.Lib.Sanitizer import raise_on_bad_input

b_conversation = Blueprint("Conversation", __name__)

@dataclass
class MessageResult:
  text: str
  created_at: datetime

@dataclass
class GetResult:
  conversation: str
  title: str
  created_at: datetime

@b_conversation.route("/get")
@jwt_required(optional=False)
def get():
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  try:
    conversations: List[Conversation] = Conversation.objects( # type: ignore
      owner=user_id.id
    ).only("id", "title", "created_at").order_by("-created_at")  # Sort by newest first
    
    results: List[GetResult] = []
    for conv in conversations:
      results.append(
        GetResult(
          conversation=str(conv.id), # type: ignore
          title=str(conv.title),
          created_at=conv.created_at, # type: ignore
        )
      )
    return jsonify([ asdict(i) for i in results]), 200

  except Exception as e:
    Logger.log.error(repr(e))
    return jsonify([]), 200


@b_conversation.route("/get/<id>")
@jwt_required(optional=False)
def get_id(id: str):
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  try:
    # Verify the conversation belongs to the user
    conversation = Conversation.objects(id=id, owner=user_id.id).first()
    if not conversation:
      return jsonify({"error": "Conversation not found"}), 404

    messages: List[Message] = Message.objects( # type: ignore
      conversation=id
    ).only("id", "text", "created_at").order_by("created_at")

    results = []
    for msg in messages:
      results.append(
        MessageResult(
          text=str(msg.text),
          created_at=msg.created_at # type: ignore
        )
      )
    return jsonify([ asdict(i) for i in results]), 200

  except Exception as e:
    Logger.log.error(repr(e))
    return BadRequest()


@b_conversation.route("/create", methods=["POST"])
@jwt_required(optional=False)
def create():
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  try:
    # Create new conversation with default title
    new_conversation = Conversation(
      owner=user_id.id,
      title="New Chat",
      created_at=datetime.utcnow()
    )
    new_conversation.save()

    # Return the response that matches ChatSidebarNewChat type
    return jsonify({
      "conversation": str(new_conversation.id),
      "title": str(new_conversation.title),
      "created_at": new_conversation.created_at.isoformat()
    }), 201

  except Exception as e:
    Logger.log.error(repr(e))
    return jsonify({"error": "Failed to create conversation"}), 500

@b_conversation.route("/update_title/<id>", methods=["PUT"])
@jwt_required(optional=False)
def update_title(id: str):
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  try:
    # Verify the conversation belongs to the user
    conversation = Conversation.objects(id=id, owner=user_id.id).first()
    if not conversation:
      return jsonify({"error": "Conversation not found"}), 404

    # Get new title from request
    data = request.get_json()
    if not data or 'title' not in data:
      return jsonify({"error": "Title is required"}), 400

    new_title = data['title']
    raise_on_bad_input(new_title)
    if not new_title or len(new_title.strip()) == 0:
      return jsonify({"error": "Title cannot be empty"}), 400

    # Update the title
    conversation.title = new_title.strip()
    conversation.save()

    return jsonify({
      "success": True,
      "message": "Title updated",
      "conversation": str(conversation.id),
      "title": conversation.title
    }), 200

  except Exception as e:
    Logger.log.error(repr(e))
    return jsonify({"error": "Failed to update title"}), 500

@b_conversation.route("/delete/<id>", methods=["DELETE"])
@jwt_required(optional=False)
def delete(id: str):
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  try:
    # Find conversation and verify ownership
    conversation = Conversation.objects(id=id, owner=user_id.id).first()
    if not conversation:
      return jsonify({"error": "Conversation not found"}), 404

    # Delete all messages in the conversation
    Message.objects(conversation=id).delete()
    
    # Delete the conversation
    conversation.delete()

    return jsonify({"success": True, "message": "Conversation deleted"}), 200

  except Exception as e:
    Logger.log.error(repr(e))
    return jsonify({"error": "Failed to delete conversation"}), 500
