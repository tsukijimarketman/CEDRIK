from backend.Apps.Main.Filter.Services.Default import DefaultFilterService
from backend.Apps.Main.Utils.LLM import generate_model_reply
from .Dataclass import FilterResult

class FilterService:
  service = None

  def __init__(self):
    self.service = DefaultFilterService()
    # Logger.log.warning("Filter Service is not yet implemented")
    pass

  def filter(self, v: str) -> FilterResult:
    return self.service.filter(v)