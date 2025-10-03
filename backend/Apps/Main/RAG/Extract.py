from backend.Apps.Main.RAG.Dataclass import FileInfo
from backend.Lib.Error import FileNotSupported
from .Reader import *

def extract(file_info: FileInfo):
  reader = PDF(file_info.filename)
  for reader in READERS:
    if reader.is_document(file_info.stream):
      return reader.read(file_info.stream)

  raise FileNotSupported()