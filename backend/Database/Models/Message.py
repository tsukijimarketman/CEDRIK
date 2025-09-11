from mongoengine import DictField, Document, FileField, FloatField, ListField, ReferenceField, StringField, DateTimeField
from backend.Database.Models import User, Conversation
from datetime import datetime
from .BaseDocument import BaseDocument

class Message(BaseDocument):
    sender = ReferenceField(User, default=None) # None for AI
    conversation = ReferenceField(Conversation)
    text = StringField()
    bin = FileField()
    values = ListField(FloatField())