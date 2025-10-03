from backend.Apps.Main.RAG.Dataclass import FileInfo
from backend.Lib.Error import FileNotSupported
from backend.Lib.Config import DEBUG
from time import perf_counter

from backend.Lib.Logger import Logger
from .Reader import *

def extract(file_info: FileInfo):
  start = 0
  if DEBUG:
    start = perf_counter()

  for reader in READERS:
    if reader.is_document(file_info):
      if DEBUG:
        end = perf_counter()
        Logger.log.warning(f"READER {end-start}s")

      return reader.read(file_info)

  if DEBUG:
    end = perf_counter()
    Logger.log.warning(f"READER {end-start}s")

  raise FileNotSupported()