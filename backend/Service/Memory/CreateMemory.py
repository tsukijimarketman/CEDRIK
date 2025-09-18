from pymongo.collection import Collection
from pymongo.client_session import ClientSession

from backend.LLM import generate_embeddings
from backend.Database import Audit, AuditData, Memory
from backend.Utils import Collections, AuditAction
from backend.Utils.Enum import MemoryType, Permission

def create_text_memory(
  session: ClientSession,
  col_audit: Collection,
  col_memory: Collection,
  data: dict
):
  embeddings = generate_embeddings([f"{data["title"]}\n{data["content"]}"])

  mem = Memory(
    title=data["title"],
    mem_type=MemoryType.TEXT,
    text=data["content"],
    tags=data["tags"],
    permission=[Permission.ALL.value],
    embeddings=embeddings
  )
  mem.validate()
  res_insert = col_memory.insert_one(mem.to_mongo(), session=session)

  audit = Audit(
      action=AuditAction.ADD,
      data=AuditData(
          collection=Collections.MEMORY.value,
          ad_id=res_insert.inserted_id
      ).__dict__
  )
  col_audit.insert_one(audit.to_mongo(), session=session)