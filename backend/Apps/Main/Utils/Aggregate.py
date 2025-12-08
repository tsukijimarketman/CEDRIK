from dataclasses import dataclass
from typing import Any, List
from werkzeug.datastructures import ImmutableMultiDict

@dataclass
class PaginationResults:
  total: int
  page: int
  items: List[Any]

class Pagination:
  is_archive: bool
  offset: int
  max_items: int
  asc: bool # updated_at

  def __init__(self, args: ImmutableMultiDict):
    self.is_archive = bool(args.get("archive", default=0, type=int))
    self.offset = args.get("offset", default=0, type=int)
    self.max_items = args.get("maxItems", default=30, type=int)
    self.asc = bool(args.get("asc", default=0, type=int))
  
  def build_archive_match(self):
    return {
      "$match": { "is_active": not self.is_archive }
    }

  def build_pagination(self):
    return [
      {
        '$sort': {
          'updated_at': 1 if self.asc else -1
        }
      },
      { '$skip': self.offset },
      { '$limit': self.max_items }
    ]

def match_regex(key: str, filter: str):
  return {
    key: {
    "$regex": filter,
    "$options": "i"
    }
  }

def match_exists(key: str, v: bool):
  return {
    key: {
      "$exists": v
    }
  }

def match_list(key: str, filter: list[Any]):
  return {
    key: {
      "$in": filter
    }
  }
