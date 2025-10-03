from backend.Apps.Main.RAG.Dataclass import FileInfo
from .Base import BaseRAG
from charset_normalizer import from_bytes

class Text(BaseRAG):
  @classmethod
  def is_document(self, file_info: FileInfo):
    buffer = file_info.stream
    raw = buffer.read(100_000) # read 1st 100kb
    file_info.stream.seek(0) # reset buffer pointer to beggining

    if len(raw) == 0:
      return False

    result = from_bytes(raw).best()
    if not result:
      return False

    enc = result.encoding.lower()
    self.encoding = enc

    return enc in ("ascii",) or enc.startswith("utf-8") or enc.startswith("utf-16")
  
  @classmethod
  def read(self, file_info: FileInfo):
    buffer = file_info.stream
    data = buffer.read()

    if len(data) == 0:
      return ""

    decoded_data = data.decode(self.encoding)
    return decoded_data