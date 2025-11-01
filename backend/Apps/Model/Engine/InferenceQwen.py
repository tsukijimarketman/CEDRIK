from dataclasses import asdict
from typing import List

from backend.Lib.Config import TOKENIZER_CONFIG, HF_TOKEN
from backend.Lib.Common import Prompt, load_json
from .Base import LLMEngine
from huggingface_hub import InferenceClient

class InferenceQwen(LLMEngine):
  def __init__(self):
    super().__init__("Qwen/Qwen2.5-7B-Instruct")
    if len(HF_TOKEN) <= 0:
      raise Exception("HF_TOKEN not set")

    self.client = InferenceClient(
      provider="auto",
      api_key=HF_TOKEN
    )

  def generate(self, query: List[Prompt]) -> str:
    config: dict = load_json(TOKENIZER_CONFIG)
    # inference only takes these params
    config = {
      "temperature": config["temperature"],
      "top_p": config["top_p"],
      "max_tokens": config["max_new_tokens"]
    }
    completion = self.client.chat.completions.create(
      model=self.model,
      messages=[ asdict(q) for q in query ],
      **config
    )

    return completion.choices[0].message.content
