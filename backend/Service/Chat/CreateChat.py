from pymongo.collection import Collection
from pymongo.client_session import ClientSession
from numpy import ndarray
from typing import List

from backend.LLM import IModel, ModelReply, Prompt, generate_embeddings
from backend.Database import Conversation, Message, Audit, AuditData, Memory
from backend.Utils import UserToken, get_object_id, Collections, AuditAction, ObjectId
from backend.Utils.Enum import VectorIndex
from backend.config import MAX_CONTEXT_SIZE

def __search_similarity_from_memory(query_embeddings: List[float]):
  # Text only vector search
  pipeline = [
    {
        "$vectorSearch": {
            "index": VectorIndex.MEMORY.value,
            "path": "embeddings",
            "queryVector": query_embeddings,
            "numCandidates": 100,
            "limit": MAX_CONTEXT_SIZE
        }
    },
    {
        "$project": {
            "text": 1,
            "score": {"$meta": "vectorSearchScore"}  # include similarity score
        }
    }
  ]
  return list(Memory.objects.aggregate(*pipeline))

def __search_similarity_from_message(
  query_embeddings: List[float],
  conversation_id: ObjectId,
  sender_id: ObjectId,
):
  # Text only vector search
  pipeline = [
    {
        "$vectorSearch": {
            "index": VectorIndex.MESSAGE.value,
            "path": "embeddings",
            "queryVector": query_embeddings.tolist(),
            "numCandidates": 100,
            "limit": MAX_CONTEXT_SIZE,
            "filter": {
                "conversation": conversation_id,
                "sender": sender_id
            }
        }
    },
    {
        "$project": {
            "text": 1,
            "score": {"$meta": "vectorSearchScore"}  # include similarity score
        }
    }
  ]
  return list(Message.objects.aggregate(*pipeline))

def generate_reply(
  user: UserToken,
  prompt: Prompt
):
  query_embeddings = generate_embeddings([prompt.content])
  sim_results = __search_similarity_from_memory(
    query_embeddings=query_embeddings,
  )
  sim_results.append(
    __search_similarity_from_message(
      query_embeddings=query_embeddings,
      conversation_id=get_object_id(prompt.conversation),
      sender_id=get_object_id(user.id),
    )
  )
  context = [ i.text for i in sim_results ]
  interface = IModel(prompt, context)
  return interface.generate_reply()

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
    conv = Conversation(
      owner=user_id,
      title=title
    )
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
        conv = Conversation(owner=user_token.id, title=title)
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