from mongoengine import DictField, Document, FloatField, ListField, ReferenceField, StringField, DateTimeField
from backend.Database.Models import User, Conversation
from datetime import datetime


class Message(Document):
    sender = ReferenceField(User, default=None) # None for AI
    conversation = ReferenceField(Conversation)
    text = StringField(required=True)
    values = ListField(FloatField())
    metadata = DictField()
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        document.updated_at = datetime.now()

    # def __str__(self):
    #     return f"Message(email='{self.email}', username='{self.username}', password='{self.password}', role='{self.role}')"
