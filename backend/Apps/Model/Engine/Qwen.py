from dataclasses import asdict
from typing import List

from transformers import AutoProcessor, AutoModelForVision2Seq
from backend.Lib.Config import TOKENIZER_CONFIG
from backend.Lib.Common import Prompt, load_json
from .Base import LLMEngine

class Qwen(LLMEngine):
  def __init__(self):
    super().__init__("Qwen/Qwen3-Next-80B-A3B-Instruct")
    self._processor = AutoProcessor.from_pretrained(self.model, trust_remote_code=True)
    self._model = AutoModelForVision2Seq.from_pretrained(self.model,
      device_map="auto",
      load_in_8bit=True,
      trust_remote_code=True
    )

  def generate(self, query: List[Prompt]) -> str:
    config = load_json(TOKENIZER_CONFIG)
    inputs = self._processor.apply_chat_template(
        [asdict(i) for i in query],
        **config
    ).to(self._model.device)

    outputs = self._model.generate(**inputs, max_new_tokens=128)
    return self._processor.decode(outputs[0][inputs["input_ids"].shape[-1]:])