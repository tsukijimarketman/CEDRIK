from dataclasses import dataclass
from typing import List, Union
from mongoengine import DictField, EnumField, ReferenceField

from backend.Apps.Main.Utils import UserToken, get_object_id
from backend.Apps.Main.Utils.Enum import AuditType, Collections
from .BaseDocument import BaseDocument
from .User import User
from bson import ObjectId

class Audit(BaseDocument):
    user = ReferenceField(User, default=None) # None for AI Model
    type = EnumField(AuditType, required=True)
    data = DictField()

    @staticmethod
    def audit_collection(user_token: UserToken | None, type: AuditType, collection: Collections, id: ObjectId, from_data: dict | None = None, to_data: dict | None = None):
        """
        for AuditType `ADD` or `DELETE` keep `from_data` and `to_data` to None
        """
        user_id = None
        try:
            if user_token != None:
                user_id = get_object_id(user_token.id)
        except Exception as _:
            pass
        return Audit(
            type=type,
            user=user_id,
            data={
                "collection": collection.value,
                "id": str(id),
                "from": from_data,
                "to": to_data
            }
        )

    @staticmethod
    def audit_message(user_token: UserToken | None, msg: str, type: AuditType = AuditType.MESSAGE):
        user_id = None
        try:
            if user_token != None:
                user_id = get_object_id(user_token.id)
        except Exception as _:
            pass
        return Audit(
            type=type,
            user=user_id,
            data={
                "msg": msg
            }
        )