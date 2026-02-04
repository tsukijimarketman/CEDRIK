from dataclasses import dataclass
import unittest
from typing import Any
from bs4 import BeautifulSoup

from backend.Lib.Error import BadBody

def _contains_html(v: str) -> bool:
  return bool(BeautifulSoup(str(v), "html.parser").find())

def contains_html(v: Any) -> bool:
  if type(v) is str:
    return _contains_html(v)

  members = None
  if type(v) is dict:
    members = v
  else:
    if not hasattr(v, "__dict__"):
      return False
    members = vars(v)

  if members == None:
    return False

  for i in members.values():
    if _contains_html(str(i)):
      return True

  return False

def raise_on_bad_input(v):
  if contains_html(v):
    raise BadBody()

class TestContainsHtml(unittest.TestCase):
  def test_1(self):
    @dataclass
    class DClass:
      a: str
      b: int
      c: dict
      d: str

    c = DClass(a="asd", b=213, c={"a": "ads"},d="<div>asd</div>")
    self.assertTrue(contains_html(c), "must contain html")

  def test_2(self):
    @dataclass
    class DClass:
      a: str
      b: int
      c: dict
      d: str

    c = DClass(a="asd", b=213, c={"a": "ads"},d="asd")
    self.assertFalse(contains_html(c), "must not contain html")

  def test_3(self):
    class DClass:
      def __init__(self):
        self.a = 21312
        self.b = "<div>alert(1)</div>"
        self.c = {"a": 123}


    c = DClass()
    self.assertTrue(contains_html(c), "must contain html")

  def test_4(self):
    self.assertTrue(contains_html("<div>"), "must contain html")

  def test_5(self):
    self.assertFalse(contains_html("asda. jsakjd"), "must not contain html")

  def test_6(self):
    @dataclass
    class DClass:
      a: str
      b: int
      c: dict
      d: str

    c = DClass(a="asd", b=213, c={"a": "<script>alert(1)</script>"},d="asd")
    self.assertTrue(contains_html(c), "must contain html")

  def test_7(self):
    @dataclass
    class DClass:
      a: str
      b: int
      c: dict
      d: str

    c = DClass(a="asd", b=213, c={"a": { "b": { "c": "<script>alert(1)</script>" }}},d="asd")
    self.assertTrue(contains_html(c), "must contain html")
