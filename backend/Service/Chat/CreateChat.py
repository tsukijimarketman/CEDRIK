from pymongo.collection import Collection
from pymongo.client_session import ClientSession
from bson.objectid import ObjectId

from backend.LLM import ModelReply, Prompt
from backend.Database import Conversation, Message, Audit, AuditData
from backend.Utils import UserToken, get_object_id, Collections, AuditAction

def __create_conversation(owner: ObjectId, title: str):
    return Conversation(
      owner=owner,
      title=title
    )

def create_chat(
  session: ClientSession,
  col_audit: Collection,
  col_conversation: Collection,
  col_message: Collection,
  model_reply: ModelReply,
  default_title: str,
  conversation_id: str | None,
  prompt: Prompt,
  user_token: UserToken
):
  """
  Creates a text chat

  this method will create 2 `Message` entry in the `db`
  the `user prompt` and the `model reply`

  Throws:
    `Error.InvalidId`
    `mongoengine.ValidationError`
  """

  title=default_title
  user_id = get_object_id(user_token.id)
  conv_id = None

  # Conversation
  if conversation_id == None or len(conversation_id) == 0:
    conv = __create_conversation(user_id, title)
    conv.validate()
    conv_id = col_conversation.insert_one(conv.to_mongo(), session=session).inserted_id

    col_audit.insert_one(Audit(
       action=AuditAction.ADD,
       data=AuditData(
          collection=Collections.CONVERSATION.value,
          ad_id=str(conv_id)
       ).__dict__
    ).to_mongo(), session=session)

  else:
      conv_id = get_object_id(conversation_id)
      conv = Conversation.objects.with_id(conv_id)
      if (conv == None):
        conv = __create_conversation(user_token.id, title)
        conv.validate()
        conv_id = col_conversation.insert_one(conv.to_mongo(), session=session).inserted_id

        col_audit.insert_one(Audit(
          action=AuditAction.ADD,
          data=AuditData(
              collection=Collections.CONVERSATION.value,
              ad_id=str(conv_id)
          ).__dict__
        ).to_mongo(), session=session)
  # ============

  # Create message of User
  message = Message(
    sender=user_id,
    conversation=conv_id,
    text=prompt.content,
    embeddings=model_reply.embeddings
  )
  message.validate()

  ai_reply = Message(
    sender=None,
    conversation=conv_id,
    text=model_reply.decoded,
    embeddings=[]
  )
  ai_reply.validate()

  messages_id = col_message.insert_many([message.to_mongo(),ai_reply.to_mongo()], session=session).inserted_ids

  # Audit for Messages
  messages_audits = []
  for iid in messages_id:
    ad = Audit(
      action=AuditAction.ADD,
      data=AuditData(
          collection=Collections.MESSAGE.value,
          ad_id=str(iid)
      ).__dict__
    )
    ad.validate()
    messages_audits.append(ad.to_mongo())

  col_audit.insert_many(messages_audits, session=session)
  # ============