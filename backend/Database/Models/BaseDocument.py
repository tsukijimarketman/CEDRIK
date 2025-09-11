from mongoengine import DictField, Document, DateTimeField
from datetime import datetime

class BaseDocument(Document):
    metadata = DictField()
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    # Allow inheritance of Document
    meta = {"abstract": True}

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        document.updated_at = datetime.now()