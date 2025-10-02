import io

class BaseRAG:
  def __init__(self, type, name, ext):
    self.type = type
    self.name = name
    self.ext = ext
  
  def is_document(self, buffer: io.BufferedReader) -> bool:
    raise NotImplementedError()
  
  def read(self, buffer: io.BufferedReader) -> str:
    raise NotImplementedError()