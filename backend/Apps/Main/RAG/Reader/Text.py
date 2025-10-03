from backend.Apps.Main.RAG.Dataclass import FileInfo
from backend.Lib.Error import FileNotSupported
from .Base import BaseRAG
from charset_normalizer import from_bytes

class Text(BaseRAG):
  @classmethod
  def is_document(cls, file_info: FileInfo):
    buffer = file_info.stream
    raw = buffer.read(100_000) # read 1st 100kb
    file_info.stream.seek(0) # reset buffer pointer to beggining

    if len(raw) == 0:
      return False

    result = from_bytes(raw).best()
    if not result:
      return False

    enc = result.encoding.lower()
    return enc in ("ascii",) or enc.startswith("utf-8") or enc.startswith("utf-16")
  
  @classmethod
  def read(cls, file_info: FileInfo):
    try:
      buffer = file_info.stream
      data = buffer.read()

      if len(data) == 0:
        return ""

      result = from_bytes(data).best()
      if not result:
        return ""
      encoding = result.encoding.lower()

      try:
        decoded_data = data.decode(encoding=encoding)
        return decoded_data
      except Exception as _:
        return data.decode()
    except Exception as _:
      raise FileNotSupported()