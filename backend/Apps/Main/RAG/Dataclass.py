from dataclasses import dataclass
from io import BytesIO


@dataclass
class FileInfo:
  filename: str
  stream: BytesIO
  content_type: str = ""