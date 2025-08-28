from mongoengine import DictField, Document, FloatField, ListField, ReferenceField, StringField, DateTimeField
from backend.Database.Models import User
from datetime import datetime

class Conversation(Document):
    owner = ReferenceField(User, default=None) # None for AI
    title = StringField(required=True)
    metadata = DictField()
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        document.updated_at = datetime.now()
