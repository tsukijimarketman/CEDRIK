from typing import Any
from mongoengine import EnumField, StringField
from backend.Apps.Main.Hasher import hash
from backend.Apps.Main.Utils.Enum import Role
from backend.Apps.Main.Validation import validate_password, validate_username
from backend.Apps.Main.Utils import CustomEmail
from backend.Lib.Logger import Logger
from .BaseDocument import BaseDocument

class User(BaseDocument):
    email = CustomEmail(required=True, unique=True)
    username = StringField(required=True, unique=True,validation=validate_username)
    password = StringField(required=True, validation=validate_password)
    role = EnumField(Role, default=Role.USER)

    """
    Call after `validate`
    """
    def hash_password(self):
        self.password = hash(self.password) # type: ignore

    def __str__(self):
        return f"User(email='{self.email}', username='{self.username}', password='{self.password}', role='{self.role}')"

    @staticmethod
    def to_dict_from(user_obj: Any):
        try:
            id = ""
            username = ""
            email = ""
            role = Role.USER
            # Extract fields safely
            if isinstance(user_obj, dict):
                id = user_obj.get("id", "")
                username = user_obj.get("username", "")
                email = user_obj.get("email", "")
                role = user_obj.get("role", Role.USER)
            else:
                id = getattr(user_obj, "id", "")
                username = getattr(user_obj, "username", "")
                email = getattr(user_obj, "email", "")
                role = getattr(user_obj, "role", Role.USER)

            user = User(
                username=username,
                email=email,
                role=role
            )

            user_dict = user.to_mongo().to_dict()
            user_dict["id"] = str(id)
            return user_dict
        except Exception as e:
            Logger.log.error(repr(e))
            return {}