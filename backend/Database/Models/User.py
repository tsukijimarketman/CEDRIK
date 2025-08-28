from enum import Enum, unique
from mongoengine import Document, EmailField, StringField, DateTimeField
from backend.Hasher import hash
from backend.Utils import validate_password
from datetime import datetime

class ROLE(Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

class User(Document):
    email = EmailField(required=True, unique=True)
    username = StringField(required=True, unique=True)
    password = StringField(required=True, validation=validate_password)
    role = StringField(choices=[e.value for e in ROLE], default=ROLE.USER.value)
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    def set_password(self, raw):
        self.password = hash(raw)

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        document.updated_at = datetime.now()

    def __str__(self):
        return f"User(email='{self.email}', username='{self.username}', password='{self.password}', role='{self.role}')"
