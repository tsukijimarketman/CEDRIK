from dataclasses import dataclass
from typing import List, Union
from mongoengine import DictField, EnumField

from backend.Apps.Main.Utils.Enum import AuditType, Collections
from .BaseDocument import BaseDocument
from bson import ObjectId

class Audit(BaseDocument):
    meta = {"allow_inheritance": True, "strict": False, "collection": "audit"}
    type = EnumField(AuditType, required=True)
    data = DictField()

    @staticmethod
    def audit_collection(type: AuditType, collection: Collections, id: ObjectId, from_data: dict | None = None, to_data: dict | None = None):
        """
        for AuditType `ADD` or `DELETE` keep `from_data` and `to_data` to None
        """
        return Audit(
            type=type,
            data={
                "collection": collection.value,
                "id": id,
                "from": from_data,
                "to": to_data
            }
        )

    @staticmethod
    def audit_message(msg: str, type: AuditType = AuditType.MESSAGE):
        return Audit(
            type=type,
            data={
                "msg": msg
            }
        )