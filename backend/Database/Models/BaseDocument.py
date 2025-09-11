from mongoengine import DictField, Document, DateTimeField, BooleanField
from datetime import datetime

class BaseDocument(Document):
    metadata = DictField()
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    deleted_at = DateTimeField(default=None)
    is_active = BooleanField(default=True)

    # Allow inheritance of Document
    meta = {"abstract": True}

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        document.updated_at = datetime.now()