from pymongo.collection import Collection
from pymongo.client_session import ClientSession
from typing import List
from concurrent.futures import ThreadPoolExecutor
import time

from backend.Apps.Main.Database import Conversation, Message, Audit, Memory
from backend.Apps.Main.Utils.Audit import audit_collection
from backend.Lib.Logger import Logger
from backend.Apps.Main.Utils import UserToken, get_object_id, Collections, AuditType, ObjectId
from backend.Apps.Main.Utils.Enum import VectorIndex
from backend.Lib.Config import MAX_CONTEXT_SIZE
from backend.Apps.Main.Utils.LLM import Prompt, generate_embeddings, generate_model_reply, Reply

def __search_similarity_from_memory(query_embeddings: List[float]):
  # Text only vector search
  # ✅ FIXED: Added filter to exclude soft-deleted memories
  pipeline = [
    {
        "$vectorSearch": {
            "index": VectorIndex.MEMORY.value,
            "path": "embeddings",
            "queryVector": query_embeddings,
            "numCandidates": 100,
            "limit": MAX_CONTEXT_SIZE,
            "filter": {
                "deleted_at": None  # ✅ Only include non-deleted memories
            }
        }
    },
    {
        "$project": {
            "text": 1,
            "score": {"$meta": "vectorSearchScore"}  # include similarity score
        }
    },
    {
        "$match": {
            "score": { "$gte": 0.65 }
        }
    }
  ]
  return list(Memory.objects.aggregate(*pipeline)) # type: ignore

def __get_conversation_history(
    conversation_id: ObjectId,
    limit: int = 5
) -> List[dict]:
    """Get the last N messages from a conversation in chronological order"""
    messages = Message.objects(
        conversation=conversation_id
    ).order_by("-created_at").limit(limit)
    
    # Reverse to get chronological order (oldest first)
    history = []
    for msg in reversed(list(messages)):
        history.append({
            "role": "assistant" if msg.sender is None else "user",
            "content": msg.text
        })
    
    return history

def __get_last_message(
  conversation_id: ObjectId,
  sender_id: ObjectId,
):
  return [ { "text": i.text } for i in list(
    Message.objects( # type: ignore
        conversation=conversation_id,
        sender=sender_id
       )
      .only("text")
      .order_by("-created_at")
      .limit(MAX_CONTEXT_SIZE)
  ) ]

def generate_reply(
  conversation_id: str | None,  # Allow None
  user: UserToken,
  prompt: Prompt,
  overrides: dict
):
  query_embeddings = generate_embeddings([prompt.content])

  if len(query_embeddings) == 0:
    Logger.log.warning("Embeddings length is 0")

  sim_results = []
  conversation_history = []
  
  # DEBUG: Log the conversation_id
  Logger.log.info(f"conversation_id: '{conversation_id}'")
  
  if len(query_embeddings) > 0:
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=3) as executer:
      ex1 = executer.submit(__search_similarity_from_memory, query_embeddings=query_embeddings)
      
      ex2 = None
      ex3 = None
      # FIX: Check if conversation_id is not None AND not empty
      if conversation_id is not None and len(conversation_id) > 0:
        try:
          conv_obj_id = get_object_id(conversation_id)
          Logger.log.info(f"Valid conversation ObjectId: {conv_obj_id}")
          
          ex2 = executer.submit(
            __get_last_message,
            conversation_id=conv_obj_id,
            sender_id=get_object_id(user.id),
          )
          
          ex3 = executer.submit(
            __get_conversation_history,
            conversation_id=conv_obj_id,
            limit=5
          )
        except Exception as e:
          Logger.log.error(f"Error getting conversation context: {e}")

      sim_results.extend(ex1.result())
      
      if ex2 is not None:
        try:
          last_messages = ex2.result()
          sim_results.extend(last_messages)
          Logger.log.info(f"Retrieved {len(last_messages)} last messages for RAG")
        except Exception as e:
          Logger.log.error(f"Error getting last messages: {e}")
          
      if ex3 is not None:
        try:
          conversation_history = ex3.result()
          Logger.log.info(f"Retrieved conversation_history with {len(conversation_history)} messages")
        except Exception as e:
          Logger.log.error(f"Error getting conversation history: {e}")
      
    end = time.perf_counter()
    elapsed = end - start
    Logger.log.info(f"Query Context took {elapsed}ms")

  Logger.log.info(f"context {sim_results}")
  Logger.log.info(f"conversation_history {conversation_history}")
  
  context = [ i["text"] for i in sim_results ]

  start = time.perf_counter()
  reply = generate_model_reply(
    prompt=prompt, 
    context=context, 
    conversation_history=conversation_history,
    overrides=overrides
  )
  end = time.perf_counter()
  elapsed = end - start
  Logger.log.info(f"Reply Generation took {elapsed}ms")

  return Reply(
    reply=reply,
    embeddings=query_embeddings,
    prompt=prompt
  )

# ✅ NEW: Streaming version of generate_reply
def generate_reply_stream(
    conversation_id: str | None,
    user: UserToken,
    prompt: Prompt,
    overrides: dict
):
    """
    Streaming version of generate_reply that yields chunks as they come from the model.
    This allows for real-time response streaming and proper cancellation.
    """
    query_embeddings = generate_embeddings([prompt.content])

    if len(query_embeddings) == 0:
        Logger.log.warning("Embeddings length is 0")

    sim_results = []
    conversation_history = []
    
    Logger.log.info(f"conversation_id: '{conversation_id}'")
    
    if len(query_embeddings) > 0:
        start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=3) as executer:
            ex1 = executer.submit(__search_similarity_from_memory, query_embeddings=query_embeddings)
            
            ex2 = None
            ex3 = None
            if conversation_id is not None and len(conversation_id) > 0:
                try:
                    conv_obj_id = get_object_id(conversation_id)
                    Logger.log.info(f"Valid conversation ObjectId: {conv_obj_id}")
                    
                    ex2 = executer.submit(
                        __get_last_message,
                        conversation_id=conv_obj_id,
                        sender_id=get_object_id(user.id),
                    )
                    
                    ex3 = executer.submit(
                        __get_conversation_history,
                        conversation_id=conv_obj_id,
                        limit=5
                    )
                except Exception as e:
                    Logger.log.error(f"Error getting conversation context: {e}")

            sim_results.extend(ex1.result())
            
            if ex2 is not None:
                try:
                    last_messages = ex2.result()
                    sim_results.extend(last_messages)
                    Logger.log.info(f"Retrieved {len(last_messages)} last messages for RAG")
                except Exception as e:
                    Logger.log.error(f"Error getting last messages: {e}")
                    
            if ex3 is not None:
                try:
                    conversation_history = ex3.result()
                    Logger.log.info(f"Retrieved conversation_history with {len(conversation_history)} messages")
                except Exception as e:
                    Logger.log.error(f"Error getting conversation history: {e}")
        
        end = time.perf_counter()
        elapsed = end - start
        Logger.log.info(f"Query Context took {elapsed}ms")

    Logger.log.info(f"context {sim_results}")
    Logger.log.info(f"conversation_history {conversation_history}")
    
    context = [i["text"] for i in sim_results]

    start = time.perf_counter()
    
    # ✅ Stream the model reply
    full_reply = ""
    for chunk in generate_model_reply_stream(
        prompt=prompt,
        context=context,
        conversation_history=conversation_history,
        overrides=overrides
    ):
        full_reply += chunk
        yield chunk  # Yield each chunk to the client
    
    end = time.perf_counter()
    elapsed = end - start
    Logger.log.info(f"Reply Generation took {elapsed}ms")
    
    # Return the full reply and embeddings after streaming is done
    yield {
        "embeddings": query_embeddings,
        "full_reply": full_reply,
        "prompt": prompt
    }

# ✅ NEW: Helper function for streaming model replies
def generate_model_reply_stream(
    prompt: Prompt,
    context: List[str],
    conversation_history: List[dict],
    overrides: dict
):
    """Stream model reply chunks"""
    from backend.Apps.Model.Engine import GroqEngine
    
    query = []
    
    if len(context) > 0:
        formatted_context = "\n\n".join([f"Context {i+1}:\n{ctx}" for i, ctx in enumerate(context)])
        query.append(Prompt(
            role="system",
            content=f"""You are an AI assistant with access to relevant knowledge.
            
Use the following context to help answer questions:

{formatted_context}

Answer based on the context provided. If the answer isn't in the context, use your general knowledge."""
        ))
    
    for msg in conversation_history:
        query.append(Prompt(role=msg["role"], content=msg["content"]))
    
    query.append(prompt)
    
    # Stream from engine
    engine = GroqEngine()
    for chunk in engine.generate_stream(query, overrides):
        yield chunk

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
  try:
    if conversation_id != None:
      conv_id = get_object_id(conversation_id)
  except Exception as _:
    pass

  # Conversation
  if conversation_id == None or len(conversation_id) == 0:
    conv = Conversation(
      owner=user_id,
      title=title
    )
    conv.validate()
    conv_id = col_conversation.insert_one(conv.to_mongo(), session=session).inserted_id

    col_audit.insert_one(audit_collection(
      type=AuditType.ADD,
      collection=Collections.CONVERSATION,
      id=conv_id
    ).to_mongo(), session=session)

  else:
      conv = Conversation.objects.with_id(conv_id) # type: ignore
      if (conv == None):
        conv = Conversation(owner=user_token.id, title=title)
        conv.validate()
        conv_id = col_conversation.insert_one(conv.to_mongo(), session=session).inserted_id

        col_audit.insert_one(audit_collection(
          type=AuditType.ADD,
          collection=Collections.CONVERSATION,
          id=conv_id
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
    ad = audit_collection(
      type=AuditType.ADD,
      collection=Collections.CONVERSATION,
      id=iid
    )
    ad.validate()
    messages_audits.append(ad.to_mongo())

  col_audit.insert_many(messages_audits, session=session)
  # ============

  return conv_id