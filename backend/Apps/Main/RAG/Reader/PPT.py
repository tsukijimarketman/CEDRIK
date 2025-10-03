from pptx import Presentation

from backend.Lib.Error import FileNotSupported
from .Base import BaseRAG

class PPT(BaseRAG):
  @classmethod
  def is_document(self, file_info) -> bool:
    is_correct_content_type = file_info.content_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    return file_info.filename.lower().endswith(".pptx") or is_correct_content_type
  
  @classmethod
  def read(self, file_info) -> str:
    try:
      file_info.stream.seek(0)
      prs = Presentation(file_info.stream)
      texts = []
      for slide in prs.slides:
          for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                texts.append(shape.text)
      return "\n".join(texts)
    except Exception as e:
      return FileNotSupported(str(e))