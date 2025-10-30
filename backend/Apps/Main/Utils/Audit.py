from bson import ObjectId
from flask import request

from backend.Apps.Main.Database.Models import Audit
from backend.Apps.Main.Utils import UserToken
from backend.Apps.Main.Utils.Enum import AuditType, Collections
from backend.Apps.Main.Utils.UserToken import get_object_id, get_token

def audit_collection(
    type: AuditType,
    collection: Collections,
    id: ObjectId,
    from_data: dict | None = None,
    to_data: dict | None = None
):
    """
    for AuditType `ADD` or `DELETE` keep `from_data` and `to_data` to None
    """

    user_id = None
    try:
        user_token = get_token()
        if user_token != None:
            user_id = get_object_id(user_token.id) # type: ignore
    except Exception as _:
        pass
    return Audit(
        type=type,
        user=user_id,
        data={
            "collection": collection.value,
            "ip": request.remote_addr if request.remote_addr != None else "",
            "id": str(id),
            "from": from_data,
            "to": to_data
        }
    )

def audit_message(
    msg: str,
    type: AuditType = AuditType.MESSAGE,
    user_token_ov: UserToken | None = None
):
    user_id = None
    try:
        if user_token_ov != None:
            user_token = user_token_ov
        else:
            user_token = get_token()
        if user_token != None:
            user_id = get_object_id(user_token.id) # type: ignore
    except Exception as _:
        pass
    return Audit(
        type=type,
        user=user_id,
        data={
            "ip": request.remote_addr if request.remote_addr != None else "",
            "msg": msg
        }
    )