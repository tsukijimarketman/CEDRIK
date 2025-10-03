from mongoengine import FloatField, ListField, StringField, EnumField
from mongoengine.base.fields import ObjectIdField

from backend.Apps.Main.Utils.Enum import MemoryType
from .BaseDocument import BaseDocument

class Memory(BaseDocument):
    title = StringField()
    mem_type = EnumField(MemoryType, default=MemoryType.TEXT)
    text = StringField()
    file_id = ObjectIdField(required=False)
    permission = ListField(StringField())
    tags = ListField(StringField())
    embeddings = ListField(FloatField())