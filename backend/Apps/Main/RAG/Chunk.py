import io
from typing import List

from backend.Lib.Config import CHUNK_SIZE_BYTES, CHUNK_OFFSET_BYTES

def chunkify(
  buffer: io.BytesIO,
  # TODO rename to MINIMUM_CHUNK_SIZE_BYTES
  size: int = int(CHUNK_SIZE_BYTES),
  offset: int = int(CHUNK_OFFSET_BYTES)
):
  buffer_len = buffer.getbuffer().nbytes
  chunk_size = min(buffer_len // 10, size)

  chunks: List[bytes] = []
  while True:
    data = buffer.read(chunk_size)
    if not data:
      break
    # buffer.seek(-offset, io.SEEK_CUR)

    chunks.append(data)

  return chunks

