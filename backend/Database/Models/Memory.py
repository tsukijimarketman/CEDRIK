from mongoengine import DictField, Document, FileField, FloatField, ListField, StringField, DateTimeField
from .BaseDocument import BaseDocument

class Memory(BaseDocument):
    title = StringField()
    type = StringField()

    status = StringField()
    content = FileField()
    permission = ListField(StringField())

    tags = ListField(StringField())

    values = ListField(FloatField())