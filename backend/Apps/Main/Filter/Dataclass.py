from dataclasses import dataclass

@dataclass
class FilterResult:
  value: str
  censored: list[str]
