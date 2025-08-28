from mongoengine import DictField, Document, FileField, FloatField, ListField, ReferenceField, StringField, DateTimeField
from backend.Database.Models import User, Conversation
from datetime import datetime


class Message(Document):
    sender = ReferenceField(User, default=None) # None for AI
    conversation = ReferenceField(Conversation)
    text = StringField()
    bin = FileField()
    values = ListField(FloatField())
    metadata = DictField()
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        document.updated_at = datetime.now()
