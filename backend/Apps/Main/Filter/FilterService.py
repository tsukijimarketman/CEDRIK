from backend.Apps.Main.Utils.LLM import generate_model_reply
from backend.Lib.Common import Prompt
from .Dataclass import FilterResult
from backend.Lib.Logger import Logger

class FilterService:
  service = None

  def __init__(self):
    # Logger.log.warning("Filter Service is not yet implemented")
    pass

  def filter(self, v: str) -> FilterResult:
    if v == None or len(v) == 0:
      return FilterResult(
        value=v,
        is_filtered=False
      )

    try:
      reply = generate_model_reply(
        prompt=Prompt(role="user",content=v),
        context=[
          "Check if the query contains suspicious keywords, inappropriate language, or morally questionable context. Reply only with 'yes' or 'no'. Reply with 'yes' if any of these conditions are met, otherwise reply with 'no'.",
        ]
      )

      if (reply == None or len(reply) == 0):
        return FilterResult(
          value=v,
          is_filtered=False
        )
      
      if reply.lower().find("yes") >= 0:
        return FilterResult(
          value=v,
          is_filtered=True
        )

      return FilterResult(
        value=v,
        is_filtered=False
      )
    except Exception as e:
      Logger.log.error(repr(e))

    return FilterResult(
      value=v,
      is_filtered=False
    )