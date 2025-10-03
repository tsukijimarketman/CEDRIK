from dataclasses import dataclass
import io
from typing import List
from pymongo.collection import Collection
from pymongo.client_session import ClientSession
from werkzeug.datastructures import FileStorage

from backend.Apps.Main.Database import Audit, AuditData, Memory
from backend.Apps.Main.RAG.Chunk import chunkify
from backend.Apps.Main.RAG.Dataclass import FileInfo
from backend.Apps.Main.RAG.Extract import extract
from backend.Apps.Main.Utils import Collections, AuditAction, generate_embeddings
from backend.Apps.Main.Utils.Enum import MemoryType, Permission
from backend.Apps.Main.Validation.File import validate_file

@dataclass
class CreateMemory:
  title: str
  text: str
  file: FileStorage = None
  tags: List[str] | str = ""

def _text_memory(data: CreateMemory, session: ClientSession, col_memory: Collection):
  embeddings = generate_embeddings([f"{data.title}\n{data.text}"])

  mem = Memory(
    title=data.title,
    mem_type=MemoryType.TEXT,
    text=data.text,
    tags=data.tags,
    permission=[Permission.ALL.value],
    embeddings=embeddings
  )

  mem.validate()
  return col_memory.insert_one(mem.to_mongo(), session=session).inserted_id

def _file_memory(data: CreateMemory, session: ClientSession, col_memory: Collection):
  data.file.stream.seek(0)
  file_id = Memory.content.put(
    data.file.stream,
    filename=data.file.filename,
    content_type=data.file.content_type
  )

  data.file.stream.seek(0)
  file_info = FileInfo(
    filename=data.file.filename,
    content_type=data.file.content_type,
    stream=data.file.stream
  )

  extracted = extract(file_info)

  chunks = chunkify(
    io.BytesIO(extracted.encode())
  )

  memories: List[Memory] = []
  for chunk in chunks:
    decoded = chunk.decode()
    mem = Memory(
      title=data.title,
      mem_type=MemoryType.FILE,
      tags=data.tags,
      text=decoded,
      content=file_id
    )
    mem.validate()
    memories.append(mem.to_mongo())
  
  return col_memory.insert_many(memories, session=session).inserted_ids


def create_memory(
  session: ClientSession,
  col_audit: Collection,
  col_memory: Collection,
  data: CreateMemory
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

  # if data.file != None:
  #     data.file.stream.seek(0)
  #     mem.content.put(
  #       data.file.stream,
  #       filename=data.file.filename,
  #       content_type=data.file.content_type
  #     )

  audit = Audit(
      action=AuditAction.ADD,
      data=AuditData(
          collection=Collections.MEMORY.value,
          ad_id=res_insert.inserted_id
      ).__dict__
  )
  col_audit.insert_one(audit.to_mongo(), session=session)
