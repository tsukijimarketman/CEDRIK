from .Dataclass import FilterResult
from backend.Lib.Logger import Logger

class FilterService:
  service = None

  def __init__(self):
    Logger.log.warning("Filter Service is not yet implemented")

  def filter(self, v: str) -> FilterResult:
    raise NotImplementedError()
