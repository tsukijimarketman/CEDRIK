from pymongo.collection import Collection
from pymongo.client_session import ClientSession
from typing import List

from backend.Apps.Main.Database import Conversation, Message, Audit, AuditData, Memory
from backend.Lib.Logger import Logger
from backend.Apps.Main.Utils import UserToken, get_object_id, Collections, AuditAction, ObjectId
from backend.Apps.Main.Utils.Enum import VectorIndex
from backend.Lib.Config import MAX_CONTEXT_SIZE
from backend.Apps.Main.Utils.LLM import Prompt, generate_embeddings, generate_model_reply, Reply

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
            "queryVector": query_embeddings,
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
  conversation_id: str,
  user: UserToken,
  prompt: Prompt
):
  query_embeddings = generate_embeddings([prompt.content])

  if len(query_embeddings) == 0:
    Logger.log.warning("Embeddings length is 0")
    # raise Exception(f"Embeddings is len 0")
  # Logger.log.info(f"embeddings {query_embeddings[:5]}")

  sim_results = __search_similarity_from_memory(
    query_embeddings=query_embeddings,
  )
  sim_results.extend(
    __search_similarity_from_message(
      query_embeddings=query_embeddings,
      conversation_id=get_object_id(conversation_id),
      sender_id=get_object_id(user.id),
    )
  )
  Logger.log.info(f"context {sim_results}")
  context = [ i["text"] for i in sim_results ]
  embeddings = generate_embeddings([prompt.content])
  return Reply(
    reply=generate_model_reply(prompt=prompt, context=context),
    embeddings=embeddings,
    prompt=prompt
  )

def create_chat(
  session: ClientSession,
  col_audit: Collection,
  col_conversation: Collection,
  col_message: Collection,
  model_reply: Reply,
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
    text=model_reply.reply,
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