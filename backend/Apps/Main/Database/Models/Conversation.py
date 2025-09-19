from mongoengine import DictField, Document, FloatField, ListField, ReferenceField, StringField, DateTimeField
from backend.Apps.Main.Database.Models import User
from .BaseDocument import BaseDocument

class Conversation(BaseDocument):
    owner = ReferenceField(User, default=None)
    title = StringField(required=True)