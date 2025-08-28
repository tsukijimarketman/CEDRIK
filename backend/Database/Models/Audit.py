from mongoengine import DictField, Document, StringField, DateTimeField
from datetime import datetime

class Audit(Document):
    type = StringField(required=True)
    data = DictField()
    created_at = DateTimeField(default=datetime.now)
