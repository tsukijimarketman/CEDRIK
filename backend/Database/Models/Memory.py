from enum import Enum
from mongoengine import FileField, FloatField, ListField, StringField, EnumField
from .BaseDocument import BaseDocument

class MemoryType(Enum):
    TEXT = "text"
    FILE = "file" # use metadata for filetype

class Memory(BaseDocument):
    title = StringField()
    mem_type = EnumField(MemoryType, default=MemoryType.TEXT)
    status = StringField()
    content = FileField()
    permission = ListField(StringField())
    tags = ListField(StringField())
    embeddings = ListField(FloatField())