from dataclasses import dataclass
from typing import Any, List
from werkzeug.datastructures import ImmutableMultiDict
from backend.Lib.Logger import Logger
from pymongo.synchronous.command_cursor import CommandCursor

@dataclass
class PaginationResults:
  total: int
  page: int
  items: List[Any]

class Pagination:
  def __init__(self, args: ImmutableMultiDict):
    self.pipeline = []

    self.is_archive = bool(args.get("archive", default=0, type=int))
    self.offset = args.get("offset", default=0, type=int)
    self.max_items = args.get("maxItems", default=30, type=int)
    sort = args.get("sort", default="created_at-desc", type=str)
    spl = sort.split('-')
    if len(spl) == 2:
      self.sort = (spl[0], 1 if spl[1].lower() == "asc" else -1)
    else:
      self.sort = ("created_at", -1)
  
  def set_offset_for_last_page(self, class_doc):
    if self.offset >= 0:
      return

    p = [ i for i in self.pipeline ]
    p.extend(self._get_archive_match())
    p.append({"$count": "total" })
    Logger.log.info(f"Pipeline Count: {p}")
    cmd_cursor = class_doc.objects.aggregate(p) # type: ignore
    cmd_cursor_list = cmd_cursor.to_list(1)
    if len(cmd_cursor_list) <= 0:
      self.offset = 0
      return
    self.offset = (cmd_cursor_list[0].get("total", 0) // self.max_items) * self.max_items

  def build_pipeline(self):
    self.pipeline.extend(self._get_archive_match())
    self.pipeline.extend([
      {
        "$facet": {
          "total": [ {"$count": "total" }],
          "items": self._get_pagination()
        }
      },
      {
        "$project": {
          "total": { "$ifNull": [{ "$arrayElemAt": ["$total.total", 0] }, 0] },
          "items": { "$ifNull": ["$items", []] }
        }
      }
    ])
    Logger.log.info(f"Pagination Pipeline: {self.pipeline}")
    return self.pipeline;

  def _get_archive_match(self):
    return [
      {
        "$match": {
          "$or": [
            {"is_active": not self.is_archive},
            {"deleted_at": {"$ne": None} if self.is_archive else {"$eq": None}}
          ]
        }
      }
    ]

  def _get_pagination(self):
    return [
      {
        '$sort': {
          self.sort[0]: self.sort[1]
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
