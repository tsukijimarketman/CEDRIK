from enum import Enum

class Role(Enum):
  USER = "user"
  ADMIN = "admin"
  SUPERADMIN = "superadmin"
  ASSISTANT = "assistant"

class AuditType(Enum):
  ADD = "add"
  EDIT = "edit"
  DELETE = "delete"
  MESSAGE = "message"
  LOGIN = "login"
  REGISTER = "register"
  FILTERED = "filtered"

class Collections(Enum):
  USER = "user"
  AUDIT = "audit"
  MESSAGE = "message"
  CONVERSATION = "conversation"
  MEMORY = "memory"

class MemoryType(Enum):
  TEXT = "text"
  FILE = "file" # use metadata for filetype

class Permission(Enum):
  USER = "user"
  ADMIN = "admin"
  SUPERADMIN = "superadmin"
  ALL = "all"

# Vector Index name is defined in mongodb atlas vector search
class VectorIndex(Enum):
  MEMORY = "MemoryVector"
  MESSAGE = "MessageVector"
