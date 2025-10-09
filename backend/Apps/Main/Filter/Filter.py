from flask import current_app
from .FilterExtension import KEY
from .FilterService import FilterService

def filter(v: str):
  service: FilterService = current_app.extensions[KEY]
  if not isinstance(service, FilterService):
    return None


  return service.filter(v)
