import io
from typing import List

from backend.Lib.Config import CHUNK_SIZE_BYTES, CHUNK_OFFSET_BYTES

def chunkify(
  buffer: io.BytesIO,
  size: int = int(CHUNK_SIZE_BYTES),
  offset: int = int(CHUNK_OFFSET_BYTES)
):
  chunks: List[bytes] = []
  while True:
    data = buffer.read(size)
    if not data:
      break
    # buffer.seek(-offset, io.SEEK_CUR)

    chunks.append(data)

  return chunks