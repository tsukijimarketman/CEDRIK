from mongoengine import FloatField, ListField, ReferenceField, StringField
from mongoengine.base.fields import ObjectIdField
from backend.Apps.Main.Database.Models import User, Conversation
from .BaseDocument import BaseDocument

class Message(BaseDocument):
    sender = ReferenceField(User, default=None) # None for AI Model
    conversation = ReferenceField(Conversation)
    text = StringField()
    file_id = ObjectIdField(required=False)
    embeddings = ListField(FloatField()) # No Embeddings for AI Model