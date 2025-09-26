from dataclasses import asdict
from backend.Lib.Common import load_json
from .Base import LLMEngine
from backend.Lib.Config import TOKENIZER_CONFIG
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

class Qwen3Next(LLMEngine):
  def __init__(self):
    super().__init__("Qwen/Qwen3-Next-80B-A3B-Instruct")
    config = BitsAndBytesConfig(load_in_8bit=False)
    self._tokenizer = AutoTokenizer.from_pretrained(self.model, trust_remote_code=True)
    # self._model = AutoModelForCausalLM.from_pretrained(self.model, device_map="auto", quantization_config=config)
    self._model = AutoModelForCausalLM.from_pretrained(
      self.model,
      trust_remote_code=True
    )
  
  def generate(self, query):
    config = load_json(TOKENIZER_CONFIG)

    inputs = self._tokenizer.apply_chat_template(
      [asdict(i) for i in query],
      add_generation_prompt=True,
      **config
    ).to(self._model.device)

    outputs = self._model.generate(**inputs, max_new_tokens=config["max_new_tokens"])
    return self._tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:])