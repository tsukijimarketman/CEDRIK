from mongoengine import ValidationError

def validate_username(value: str):
  if (' ' in value):
    raise ValidationError("Username cannot contain any spaces")