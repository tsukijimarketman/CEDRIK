from backend.Apps.Main.Filter.Dataclass import FilterResult
from backend.Apps.Main.Utils.LLM import classify_text
from backend.Lib.Logger import Logger


class DefaultFilterService:
    def filter(self, v: str) -> FilterResult:
        if v == None or len(v) == 0:
            return FilterResult(
                value=v,
                is_filtered=False
            )

        try:
            reply = classify_text(v)

            if (reply == None or len(reply) == 0):
                return FilterResult(
                    value=v,
                    is_filtered=False
                )
            
            if reply.lower().find("ok") == 0:
                return FilterResult(
                    value=v,
                    is_filtered=False
                )

            return FilterResult(
                value=v,
                is_filtered=True
            )
        except Exception as e:
            Logger.log.error(repr(e))

        return FilterResult(
            value=v,
            is_filtered=False
        )