from .Base import BaseRAG
from charset_normalizer import from_bytes

class Text(BaseRAG):
  def __init__(self):
    super().__init__("textfile", "text", "*")
    self.encoding = ""
  
  def is_document(self, buffer):
    raw = buffer.read(100_000) # read 1st 100kb
    buffer.seek(0) # reset buffer pointer to beggining

    if len(raw) == 0:
      return False

    result = from_bytes(raw).best()
    if not result:
      return False

    enc = result.encoding.lower()
    self.encoding = enc

    return enc in ("ascii",) or enc.startswith("utf-8") or enc.startswith("utf-16")
  
  def read(self, buffer):
    data = buffer.read()
    if len(data) == 0:
      return ""

    decoded_data = data.decode(self.encoding)
    return decoded_data