from dataclasses import dataclass

@dataclass
class FilterResult:
  value: str
  is_filtered: bool
