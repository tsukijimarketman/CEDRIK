import json
import requests
from dataclasses import asdict
from backend.Lib.Common import Prompt, load_json
from backend.Lib.Logger import Logger
from .Base import LLMEngine
from backend.Lib.Config import TOKENIZER_CONFIG, LLAMA_SERVER
from typing import List

class LLamaServer(LLMEngine):
  def __init__(self):
    super().__init__("USING LLAMA SERVER")

  def generate(self, query: List[Prompt], overrides: dict = {}) -> str:
    try:
      assert(isinstance(LLAMA_SERVER, str))
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
