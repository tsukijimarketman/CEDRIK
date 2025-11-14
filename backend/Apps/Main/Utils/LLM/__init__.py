from dataclasses import asdict, dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import json
from backend.Lib.Logger import Logger
from backend.Lib.Common import Prompt
from backend.Lib.Config import ENCODER_SERVER, MODEL_SERVER, FILTER_SERVER
from typing import Any, List

@dataclass
class Reply:
    prompt: Prompt
    embeddings: List[float]
    reply: str

def classify_text(text: str) -> str:
  try:
    with requests.Session() as s:
      retry = Retry(
        total=3,
        backoff_factor=0.3,
        allowed_methods=["POST"],
      )
      adapter = HTTPAdapter(max_retries=retry)
      adapter = HTTPAdapter(max_retries=retry)
      s.mount("http://", adapter)
      s.mount("https://", adapter)

      response = s.post(
          url=FILTER_SERVER,
          data=json.dumps({
              "context": [],
              "prompt": asdict(Prompt(role="user", content=text))
          }),
          headers={ "Content-Type": "application/json" },
          # timeout=10
      )
      response.raise_for_status()
      d = response.json()

      return d["reply"]
  except Exception as e:
      Logger.log.error(repr(e))
      return ""

def generate_model_reply(
    prompt: Prompt, 
    context: List[str] = [], 
    conversation_history: List[dict] = [],  # ← NEW
    overrides: dict = {}
) -> str:
    try:
      with requests.Session() as s:
        retry = Retry(
          total=3,
          backoff_factor=0.3,
          allowed_methods=["POST"],
        )
        adapter = HTTPAdapter(max_retries=retry)
        s.mount("http://", adapter)
        s.mount("https://", adapter)

        response = s.post(
            url=MODEL_SERVER,
            data=json.dumps({
                "context": context,
                "conversation_history": conversation_history,  # ← NEW
                "prompt": asdict(prompt),
                "overrides": overrides
            }),
            headers={ "Content-Type": "application/json" },
        )
        response.raise_for_status()
        d = response.json()

        return d["reply"]
    except Exception as e:
        Logger.log.error(repr(e))
        return ""

def generate_embeddings(buffer: List[Any]) -> List[float]:
    try:
      with requests.Session() as s:
        retry = Retry(
          total=3,
          backoff_factor=0.3,
          allowed_methods=["POST"],
        )
        adapter = HTTPAdapter(max_retries=retry)
        s.mount("http://", adapter)
        s.mount("https://", adapter)

        response = s.post(
          url=ENCODER_SERVER,
          data=json.dumps({
              "data": buffer
          }),
          headers={ "Content-Type": "application/json" },
          timeout=30
        )
        response.raise_for_status()
        d = response.json()
        return d["embeddings"]

    except Exception as e:
        Logger.log.error(repr(e))
        return []
