from dataclasses import dataclass
import io
from typing import List
from pymongo.collection import Collection
from pymongo.client_session import ClientSession
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import HTTPException
from gridfs import GridFS
from mongoengine.connection import get_db
from bson import ObjectId

from backend.Apps.Main.Database import Audit, Memory
from backend.Apps.Main.RAG.Chunk import chunkify
from backend.Apps.Main.RAG.Dataclass import FileInfo
from backend.Apps.Main.RAG.Extract import extract
from backend.Apps.Main.Utils import Collections, AuditType, UserToken, generate_embeddings
from backend.Apps.Main.Utils.Enum import MemoryType, Permission
from backend.Lib.Logger import Logger

@dataclass
class DCreateMemory:
  title: str
  text: str
  file: FileStorage | None = None
  tags: List[str] | str = ""

def _text_memory(data: DCreateMemory, session: ClientSession, col_memory: Collection): # type: ignore
  embeddings = generate_embeddings([f"{data.title}\n{data.text}"])

  mem = Memory(
    title=data.title,
    mem_type=MemoryType.TEXT,
    text=data.text,
    tags=data.tags,
    permission=[Permission.ALL.value],
    embeddings=embeddings
  )

  mem.validate() # type: ignore
  return col_memory.insert_one(mem.to_mongo(), session=session).inserted_id # type: ignore

def _file_memory(data: DCreateMemory, session: ClientSession, col_memory: Collection): # type: ignore
  assert(data.file != None)

  data.file.stream.seek(0)
  file_info = FileInfo(
    filename=data.file.filename, # type: ignore
    content_type=data.file.content_type, # type: ignore
    stream=io.BytesIO(data.file.stream.read())
  )
  data.file.stream.seek(0)

  extracted = extract(file_info)
  chunks = chunkify(
    io.BytesIO(extracted.encode())
  )
  Logger.log.warning(f"CHUNKS {chunks}")

  fs = GridFS(get_db())
  Logger.log.info("Uploading File")
  file_id: ObjectId | None = fs.put(
    data.file.stream,
    filename=data.file.filename,
    content_type=data.file.content_type
  )
  if file_id == None:
    raise HTTPException(description="Something went wrong please try again")
  Logger.log.info("File Uploaded")

  try:
    memories: List[Memory] = []
    for chunk in chunks:
      decoded = chunk.decode()
      embeddings = generate_embeddings([decoded])
      mem = Memory(
        title=data.title,
        mem_type=MemoryType.FILE,
        tags=data.tags,
        embeddings=embeddings,
        text=decoded,
        file_id=file_id
      )
      mem.validate() # type: ignore
      memories.append(mem.to_mongo()) # type: ignore
    
    return col_memory.insert_many(memories, session=session).inserted_ids # type: ignore
  except Exception as e:
    fs.delete(file_id)
    raise

def create_memory(
  user_token: UserToken | None,
  session: ClientSession,
  col_audit: Collection, col_memory: Collection, # type: ignore
  data: DCreateMemory
):
  res_insert = []
  if data.file != None:
    # inserted id array for file for each individual chunks
    res_insert = _file_memory(
      data=data,
      session=session,
      col_memory=col_memory
    )
  else:
    res_insert = _text_memory(
      data=data,
      session=session,
      col_memory=col_memory
    )

  audits = []
  if isinstance(res_insert, list):
    for inserted_id in res_insert:
      audits.append(
        Audit.audit_collection(
          user_token=user_token,
          type=AuditType.ADD,
          collection=Collections.MEMORY,
          id=inserted_id
        ).to_mongo()
      )
  else:
    audits.append(
      Audit.audit_collection(
        user_token=user_token,
        type=AuditType.ADD,
        collection=Collections.MEMORY,
        id=res_insert,
      ).to_mongo()
    )
  col_audit.insert_many(audits, session=session) # type: ignore