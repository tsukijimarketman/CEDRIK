from mongoengine import DictField, Document, FileField, FloatField, ListField, ReferenceField, StringField, DateTimeField
from backend.Database.Models import User, Conversation
from datetime import datetime


class Memory(Document):
    title = StringField()
    type = StringField()

    status = StringField()
    content = FileField()
    permission = ListField(StringField())

    tags = ListField(StringField())

    values = ListField(FloatField())

    metadata = DictField()

    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        document.updated_at = datetime.now()
