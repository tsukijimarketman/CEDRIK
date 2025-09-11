from enum import Enum
from mongoengine import EmailField, EnumField, StringField
from backend.Hasher import hash
from backend.Validation import validate_password, validate_username
from backend.Utils import CustomEmail
from .BaseDocument import BaseDocument

class Role(Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

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