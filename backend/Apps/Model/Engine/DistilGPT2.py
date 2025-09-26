from transformers import pipeline, set_seed
from backend.Lib.Config import PIPE_CONFIG
from backend.Lib.Common import Prompt, load_json
from typing import List
from .Base import LLMEngine
import time

class DistilGPT2(LLMEngine):
  def __init__(self):
    super().__init__("distilbert/distilgpt2")
    self._pipe = pipeline(
      "text-generation",
      model=self.model,
      trust_remote_code=True
    )
    set_seed(int(time.time()))
  
  def generate(self, query: List[Prompt]):
    try:
      config = load_json(PIPE_CONFIG)
    except Exception as _:
      config = {}

    q = "\n".join(f"{p.role}: {p.content}" for p in query)
    outputs = self._pipe(
      q,
      **config
    )

    reply = outputs[0]["generated_text"] 
    reply = reply.replace(q, "").strip()

    return reply