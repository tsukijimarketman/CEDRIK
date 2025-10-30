from dataclasses import dataclass

from flask import Blueprint
from .Auth import auth
from .AI import ai
from .Memory import memory
from .Conversation import b_conversation
from .Audit import b_audit
from .User import b_user

@dataclass
class Route:
  path: str
  blueprint: Blueprint

ROUTES = [
  Route(path="auth", blueprint=auth),
  Route(path="ai", blueprint=ai),
  Route(path="conversation", blueprint=b_conversation),
  Route(path="memory", blueprint=memory),
  Route(path="audit", blueprint=b_audit),
  Route(path="user", blueprint=b_user),
]