from mongoengine import ValidationError
from backend.Lib.Config import RESOURCE_DIR
import os

def validate_file(file: str):
  if os.path.exists(f"{RESOURCE_DIR}/{file}") == False:
    raise ValidationError("File does not exist")
