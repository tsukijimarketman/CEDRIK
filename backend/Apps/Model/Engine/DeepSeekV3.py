from dataclasses import asdict
from typing import List

from backend.Lib.Common import Prompt, load_json
from backend.Lib.Config import TOKENIZER_CONFIG
from .Base import LLMEngine
from transformers import AutoTokenizer, AutoModelForCausalLM

class DeepSeekV3(LLMEngine):
  def __init__(self):
    super().__init__("deepseek-ai/DeepSeek-V3")
    self._tokenizer = AutoTokenizer.from_pretrained(self.model, trust_remote_code=True)
    self._model = AutoModelForCausalLM.from_pretrained(self.model,
      # device_map="auto",
      # load_in_8bit=True,
      trust_remote_code=True
    )

  def generate(self, query: List[Prompt], overrides: dict = {}) -> str:
    config = load_json(TOKENIZER_CONFIG)
    inputs = self._tokenizer.apply_chat_template(
        [asdict(i) for i in query],
        **config
    ).to(self._model.device)

    outputs = self._model.generate(**inputs, max_new_tokens=128)
    return self._tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:])
