from dataclasses import dataclass
from mongoengine import DictField, EnumField
from enum import Enum
from .BaseDocument import BaseDocument

class AuditAction(Enum):
    ADD = "add"
    EDIT = "edit"
    DELETE = "delete"

@dataclass
class AuditData:
    collection: str = ""
    ad_id: str | None = None
    ad_from: dict | None = None
    ad_to: dict | None = None

class Audit(BaseDocument):
    action = EnumField(AuditAction, required=True)
    data = DictField()