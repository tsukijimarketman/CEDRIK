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

@b_conversation.route("")
@jwt_required(optional=False)
def get():
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  try:
    conversations: List[Conversation] = Conversation.objects( # type: ignore
      owner=user_id.id
    ).only("id", "title", "created_at")
    # Logger.log.info(f"Conversations {conversations}")

    results: List[GetResult] = []
    for conv in conversations:
      # messages = []
      # if isIncludeMessages:
      #   Logger.log.warning("TODO Optimize")
      #   msgs: List[Message] = Message.objects(conversation=conv.id) # type: ignore
      #   for m in msgs:
      #     messages.append(
      #       MessageResult(text=str(m.text))
      #     )

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

@b_conversation.route("/<id>")
@jwt_required(optional=False)
def get_id(id: str):
  user_id = get_token()
  if user_id == None:
    raise InvalidId()

  try:
    messages: List[Message] = Message.objects( # type: ignore
      conversation=id
    ).only("id", "text", "created_at")

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
