from mongoengine import FileField, FloatField, ListField, StringField, EnumField

from backend.Apps.Main.Utils.Enum import MemoryType
from .BaseDocument import BaseDocument

class Memory(BaseDocument):
    title = StringField()
    mem_type = EnumField(MemoryType, default=MemoryType.TEXT)
    text = StringField()
    file_id = StringField()
    permission = ListField(StringField())
    tags = ListField(StringField())
    embeddings = ListField(FloatField())