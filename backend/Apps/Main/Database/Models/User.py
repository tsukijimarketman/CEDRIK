from mongoengine import EnumField, StringField
from backend.Apps.Main.Hasher import hash
from backend.Apps.Main.Utils.Enum import Role
from backend.Apps.Main.Validation import validate_password, validate_username
from backend.Apps.Main.Utils import CustomEmail
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
        self.password = hash(self.password)

    def __str__(self):
        return f"User(email='{self.email}', username='{self.username}', password='{self.password}', role='{self.role}')"