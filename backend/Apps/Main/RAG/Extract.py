from backend.Apps.Main.RAG.Dataclass import FileInfo
from backend.Lib.Error import FileNotSupported
from .Reader import *

def extract(file_info: FileInfo):
  for reader in READERS:
    if reader.is_document(file_info):
      return reader.read(file_info)

  raise FileNotSupported()