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
from backend.Apps.Main.Utils.Audit import audit_collection
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
    
    # Reset stream to beginning and extract content
    data.file.stream.seek(0)
    file_info = FileInfo(
        filename=data.file.filename, # type: ignore
        content_type=data.file.content_type, # type: ignore
        stream=io.BytesIO(data.file.stream.read())
    )
    
    
    # Extract text from file
    extracted = extract(file_info)
    Logger.log.info(f"Extracted text length: {len(extracted)}")
    
    # Convert extracted text to bytes for chunking
    extracted_bytes = extracted.encode('utf-8')
    chunks = chunkify(io.BytesIO(extracted_bytes))
    Logger.log.info(f"Generated {len(chunks)} chunks from file")
    
    # Upload original file to GridFS
    data.file.stream.seek(0)  # Reset stream again for GridFS
    fs = GridFS(get_db())
    Logger.log.info("Uploading File to GridFS")
    file_id: ObjectId = fs.put(
        data.file.stream,
        filename=data.file.filename,
        content_type=data.file.content_type
    )
    
    if file_id is None:
        raise HTTPException(description="Something went wrong please try again")
    Logger.log.info(f"File Uploaded with ID: {file_id}")
    
    try:
        memories = []
        for i, chunk in enumerate(chunks):
            # Handle chunk decoding safely
            try:
                decoded = chunk.decode('utf-8')
            except UnicodeDecodeError:
                decoded = chunk.decode('utf-8', errors='replace')
                Logger.log.warning(f"Chunk {i} decoded with replaced characters")
            
            # Skip empty chunks
            if not decoded.strip():
                Logger.log.info(f"Skipping empty chunk {i}")
                continue
            
            # Generate embeddings and create memory
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
            Logger.log.info(f"Created memory chunk {i+1}/{len(chunks)}")
        
        if not memories:
            raise HTTPException(description="No valid text chunks could be extracted from the file")
            
        result = col_memory.insert_many(memories, session=session)
        Logger.log.info(f"Inserted {len(result.inserted_ids)} memory chunks")
        return result.inserted_ids
        
    except Exception as e:
        # Clean up GridFS file if memory insertion fails
        Logger.log.error(f"Error creating file memories: {e}")
        try:
            fs.delete(file_id)
            Logger.log.info(f"Cleaned up GridFS file: {file_id}")
        except Exception as delete_error:
            Logger.log.error(f"Failed to clean up GridFS file: {delete_error}")
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
        audit_collection(
          type=AuditType.ADD,
          collection=Collections.MEMORY,
          id=inserted_id
        ).to_mongo()
      )
  else:
    audits.append(
      audit_collection(
        type=AuditType.ADD,
        collection=Collections.MEMORY,
        id=res_insert,
      ).to_mongo()
    )
  col_audit.insert_many(audits, session=session) # type: ignore