from backend.Apps.Main.RAG.Dataclass import FileInfo
from .Base import BaseRAG
import PyPDF2 as pdf2
from charset_normalizer import from_bytes

class PDF(BaseRAG):
  @classmethod
  def is_document(self, file_info: FileInfo):
    ext = file_info.filename.split(".")[-1]
    if ext.lower() != self.ext:
      return False
    return True

  @classmethod
  def read(self, file_info: FileInfo):
    buffer = file_info.stream
    read_pdf = pdf2.PdfReader(buffer)

    contents = []
    for page in read_pdf.pages:
      contents.append(
        page.extract_text()
          .strip()
      )

    return "\n".join(contents)