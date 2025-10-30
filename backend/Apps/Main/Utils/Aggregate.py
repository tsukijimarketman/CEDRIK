from dataclasses import dataclass
from typing import Any, List

@dataclass
class PaginationResults:
  total: int
  page: int
  items: List[Any]

class Pagination:
  pipeline: List[dict]
  filters: List[dict]
  is_archive: bool
  page: int
  max_items: int
  sort: dict
  # asc: bool

  def __init__(self, args: dict):
    self.pipeline = []
    self.filters = []

    self.is_archive = bool(args.get("archive", default=0, type=int)) # type: ignore
    self.page = args.get("page", default=1, type=int) # type: ignore
    self.max_items = args.get("maxItems", default=30, type=int) # type: ignore

    self.sort = {}
    ign = ["archive", "offset", "maxItems"]
    for k in args.keys():
      if k in ign:
        continue
      # only one sort is allowed
      self.sort[k] = 1 if args.get(k, default=0, type=int) != 1 else -1 # type: ignore
      break
  
  def build(self):
    pipeline = self.pipeline
    pipeline.append({
      "$match": { "is_active": not self.is_archive }
    })
    pipeline.append({
      '$setWindowFields': {
          'output': {
            'total': {
              '$count': {}
            }
          }
      }
    })
    if len(self.filters) > 0:
      pipeline.append({
        "$match": {
          "$or": self.filters
        }
      })
    pipeline.extend(self.build_pagination())
    return pipeline

  def build_archive_match(self):
    return {
      "$match": { "is_active": not self.is_archive }
    }

  def build_pagination(self):
    sort = {}
    if len(self.sort) > 0:
      sort = self.sort
    else:
      sort = {
        'updated_at': -1
      }

    return [
      {
        '$sort': sort
      },
      { '$skip': 0 if self.page-1 < 0 else self.page-1 },
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