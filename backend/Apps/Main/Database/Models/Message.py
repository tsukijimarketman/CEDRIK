from mongoengine import DictField, Document, FileField, FloatField, ListField, ReferenceField, StringField, DateTimeField
from backend.Apps.Main.Database.Models import User, Conversation
from datetime import datetime
from .BaseDocument import BaseDocument

class Message(BaseDocument):
    sender = ReferenceField(User, default=None) # None for AI Model
    conversation = ReferenceField(Conversation)
    text = StringField()
    m_file = FileField()
    embeddings = ListField(FloatField()) # No Embeddings for AI Model