from mongoengine import StringField, DateTimeField
from .BaseDocument import BaseDocument

class Otp(BaseDocument):
  email = StringField(required=True)
  otp = StringField(unique=True)
  expires_at = DateTimeField(required=True)