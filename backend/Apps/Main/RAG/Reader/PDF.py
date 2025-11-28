from backend.Apps.Main.RAG.Dataclass import FileInfo
from backend.Lib.Error import FileNotSupported
from .Base import BaseRAG
import PyPDF2 as pdf2
from typing import List
from backend.Lib.Logger import Logger

class PDF(BaseRAG):
  @classmethod
  def is_document(cls, file_info: FileInfo):
    return file_info.filename.lower().endswith(".pdf") or file_info.content_type == "application/pdf"

  @classmethod
  def read(cls, file_info: FileInfo):
    buffer = file_info.stream
    try:
      read_pdf = pdf2.PdfReader(buffer)

      contents: List[str] = []
      for page_num, page in enumerate(read_pdf.pages):
        try:
          # Extract text from page
          text = page.extract_text()
          
          if text:
            # ✅ FIXED: Clean and normalize the text to handle encoding issues
            # Remove null bytes and other problematic characters
            cleaned_text = text.replace('\x00', '').strip()
            
            # Ensure the text is valid UTF-8
            # Encode and decode to catch any encoding issues early
            cleaned_text = cleaned_text.encode('utf-8', errors='ignore').decode('utf-8')
            
            if cleaned_text:  # Only add non-empty pages
              contents.append(cleaned_text)
        except Exception as e:
          Logger.log.warning(f"Failed to extract text from page {page_num + 1}: {str(e)}")
          # Continue processing other pages even if one fails
          continue

      if not contents:
        raise FileNotSupported("No text could be extracted from the PDF. The file may be image-based or corrupted.")

      return "\n".join(contents)
      
    except pdf2.errors.PdfReadError as e:
      Logger.log.error(f"PDF Read Error: {str(e)}")
      raise FileNotSupported(f"Could not read PDF file: {str(e)}")
    except Exception as e:
      Logger.log.error(f"Unexpected error reading PDF: {str(e)}")
      raise FileNotSupported(f"Error processing PDF: {str(e)}")