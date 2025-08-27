from mongoengine import Document, StringField
from backend.Hasher import hash

class User(Document):
    email = StringField(required=True)
    username = StringField(required=True)
    password = StringField(required=True)

    def clean(self):
        self.password = hash(str( self.password ))
