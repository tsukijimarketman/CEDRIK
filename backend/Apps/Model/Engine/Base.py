from backend.Lib.Common import Prompt
from typing import List

class LLMEngine:
  def __init__(self, model):
    self.model = model
  
  def generate(self, query: List[Prompt]) -> str:
    raise Exception("Do not use BaseClass")