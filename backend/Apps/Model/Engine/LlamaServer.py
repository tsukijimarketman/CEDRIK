import json
import requests
from dataclasses import asdict
from backend.Lib.Common import load_json
from backend.Lib.Logger import Logger
from .Base import LLMEngine
from backend.Lib.Config import TOKENIZER_CONFIG, LLAMA_SERVER

class LLamaServer(LLMEngine):
  def __init__(self):
    # super().__init__("Qwen/Qwen3-Next-80B-A3B-Instruct")
    super().__init__("USING LLAMA SERVER")
    # config = BitsAndBytesConfig(load_in_8bit=False)
    # self._tokenizer = AutoTokenizer.from_pretrained(self.model, trust_remote_code=True)
    # self._model = AutoModelForCausalLM.from_pretrained(self.model, device_map="auto", quantization_config=config)
    # self._model = AutoModelForCausalLM.from_pretrained(
    #   self.model,
    #   trust_remote_code=True
    # )
  
  # def generate(self, query):
  #   config = load_json(TOKENIZER_CONFIG)

  #   inputs = self._tokenizer.apply_chat_template(
  #     [asdict(i) for i in query],
  #     add_generation_prompt=True,
  #     **config
  #   ).to(self._model.device)

  #   outputs = self._model.generate(**inputs, max_new_tokens=config["max_new_tokens"])
  #   return self._tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:])

  def generate(self, query):
    try: 
      config = load_json(TOKENIZER_CONFIG)
      body = {
        "messages": [ asdict(i) for i in query ],
        **config
      }
      Logger.log.info(f"body {body}")
      response = requests.post(
        url=LLAMA_SERVER,
        data=json.dumps(body),
        headers={ "Content-Type": "application/json" },
        # timeout=120
      )
      response.raise_for_status()
      d = response.json()
      Logger.log.info(f"LLAMA SERVER OUTPUT {d}")
      return d["choices"][0]["message"]["content"]
    except Exception as e:
      Logger.log.error(str(e))
      return ""
