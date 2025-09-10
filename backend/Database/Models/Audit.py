from mongoengine import DictField, EnumField, ReferenceField
from backend.Database.Models import User
from enum import Enum
from .BaseDocument import BaseDocument

class AuditAction(Enum):
    ADD = "add"
    EDIT = "edit"
    DELETE = "delete"

class Audit(BaseDocument):
    action = EnumField(AuditAction, required=True)
    modified_by = ReferenceField(User, required=True)
    data = DictField()