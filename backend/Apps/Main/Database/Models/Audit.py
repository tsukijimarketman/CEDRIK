from dataclasses import dataclass
from mongoengine import DictField, EnumField

from backend.Apps.Main.Utils.Enum import AuditAction
from .BaseDocument import BaseDocument

@dataclass
class AuditData:
    collection: str = ""
    ad_id: str | None = None
    ad_from: dict | None = None
    ad_to: dict | None = None

class Audit(BaseDocument):
    action = EnumField(AuditAction, required=True)
    data = DictField()