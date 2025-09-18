from enum import Enum
from mongoengine import FileField, FloatField, ListField, StringField, EnumField

from backend.Utils.Enum import MemoryType
from .BaseDocument import BaseDocument


class Memory(BaseDocument):
    title = StringField()
    mem_type = EnumField(MemoryType, default=MemoryType.TEXT)
    status = StringField()
    content = FileField()
    permission = ListField(StringField())
    tags = ListField(StringField())
    embeddings = ListField(FloatField())