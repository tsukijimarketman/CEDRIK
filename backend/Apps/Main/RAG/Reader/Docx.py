from docx import Document

from backend.Lib.Error import FileNotSupported
from .Base import BaseRAG

class Docx(BaseRAG):
  @classmethod
  def is_document(self, file_info) -> bool:
    is_correct_content_type = file_info.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return file_info.filename.lower().endswith(".docx") or is_correct_content_type
  
  @classmethod
  def read(self, file_info) -> str:
    try:
        file_info.stream.seek(0)
        doc = Document(file_info.stream)
        texts = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(texts)
    except Exception as e:
      return FileNotSupported(str(e))