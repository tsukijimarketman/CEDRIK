from dataclasses import dataclass

from flask import Blueprint
from .Auth import auth
from .AI import ai
from .Memory import memory
from .Conversation import conversation

@dataclass
class Route:
  path: str
  blueprint: Blueprint

ROUTES = [
  Route(path="auth", blueprint=auth),
  Route(path="ai", blueprint=ai),
  Route(path="conversation", blueprint=conversation),
]