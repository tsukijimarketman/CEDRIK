from enum import Enum, unique
from mongoengine import Document, EmailField, StringField
from backend.Hasher import hash
from backend.Utils import validate_password

class ROLE(Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

class User(Document):
    email = EmailField(required=True, unique=True)
    username = StringField(required=True, unique=True)
    password = StringField(required=True, validation=validate_password)
    role = StringField(choices=[e.value for e in ROLE], default=ROLE.USER.value)

    def clean(self):
        self.password = hash(str( self.password ))

    def __str__(self):
        return f"User(email='{self.email}', username='{self.username}', password='{self.password}', role='{self.role}')"
