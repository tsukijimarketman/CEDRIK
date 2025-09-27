from pymongo.collection import Collection
from pymongo.client_session import ClientSession

from backend.Apps.Main.Database import Audit, AuditData, Memory
from backend.Apps.Main.Utils import Collections, AuditAction, generate_embeddings
from backend.Apps.Main.Utils.Enum import MemoryType, Permission
from backend.Apps.Main.Validation.File import validate_file

def create_memory(
  session: ClientSession,
  col_audit: Collection,
  col_memory: Collection,
  data: dict
):
  files = data["files"]
  mem_type = MemoryType.TEXT
  embeddings = []
  if len(files) > 0:
    mem_type = MemoryType.FILE
  else:
    embeddings = generate_embeddings([f"{data['title']}\n{data['content']}"])

  # At the moment use the embeddings of the title and text even for files
  mem = Memory(
    title=data["title"],
    mem_type=mem_type,
    text=data["content"],
    tags=data["tags"],
    permission=[Permission.ALL.value],
    embeddings=embeddings
  )

  # Only take 1 file
  if len(files) > 0:
    validate_file(files[0])
    with open(files[0], "rb") as f:
      mem.content.put(
        f,
        session=session
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
