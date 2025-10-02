from .Base import BaseRAG
import PyPDF2 as pdf2
from charset_normalizer import from_bytes

class Text(BaseRAG):
  def __init__(self, filepath):
    super().__init__("pdf", "pdf", "pdf")
    self.filepath: str = filepath
  
  def is_document(self, buffer):
    ext = self.filepath.split(".")[-1]
    if ext.lower() != self.ext:
      return False
    return True

  def read(self, buffer):
    read_pdf = pdf2.PdfReader(buffer)
    contents = []
    for page in read_pdf.pages:
      contents.append(
        page.extract_text()
          .strip()
      )

    return "\n".join(contents)