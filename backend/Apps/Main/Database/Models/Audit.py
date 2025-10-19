from mongoengine import DictField, EnumField, ReferenceField

from backend.Apps.Main.Utils.Enum import AuditType
from .BaseDocument import BaseDocument
from .User import User

class Audit(BaseDocument):
    user = ReferenceField(User, default=None) # None for AI Model
    type = EnumField(AuditType, required=True)
    data = DictField()