from enum import Enum

class Role(Enum):
  USER = "user"
  ADMIN = "admin"
  SUPERADMIN = "superadmin"

class AuditAction(Enum):
  ADD = "add"
  EDIT = "edit"
  DELETE = "delete"

class Collections(Enum):
  USER = "user"
  AUDIT = "audit"
  MESSAGE = "message"
  CONVERSATION = "conversation"

class MemoryType(Enum):
  TEXT = "text"
  FILE = "file" # use metadata for filetype