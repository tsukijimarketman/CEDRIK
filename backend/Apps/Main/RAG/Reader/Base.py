from backend.Apps.Main.RAG.Dataclass import FileInfo

class BaseRAG:
  @classmethod
  def is_document(cls, file_info: FileInfo) -> bool:
    raise NotImplementedError()
  
  @classmethod
  def read(cls, file_info: FileInfo) -> str:
    raise NotImplementedError()