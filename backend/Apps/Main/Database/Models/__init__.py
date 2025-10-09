from .User import User
from .Conversation import Conversation
from .Message import Message
from .Memory import *
from .Audit import Audit

def init_indexes():
  User.ensure_indexes()
  Conversation.ensure_indexes()
  Message.ensure_indexes()
  Memory.ensure_indexes()
  Audit.ensure_indexes()