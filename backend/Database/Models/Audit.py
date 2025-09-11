from mongoengine import DictField, Document, EnumField, DateTimeField, ReferenceField
from datetime import datetime
from backend.Database.Models import User
from enum import Enum

class AuditType(Enum):
    ADD = "add"
    EDIT = "edit"
    DELETE = "delete"

class Audit(Document):
    type = EnumField(AuditType, required=True)
    modified_by = ReferenceField(User, required=True)
    data = DictField()
    created_at = DateTimeField(default=datetime.now)
