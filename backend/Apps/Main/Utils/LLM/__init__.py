from dataclasses import asdict, dataclass
import requests
import json
from backend.Lib.Logger import Logger
from backend.Lib.Common import Prompt
from backend.Lib.Config import ENCODER_SERVER, MODEL_SERVER
from typing import Any, List

@dataclass
class Reply:
    prompt: Prompt
    embeddings: List[float]
    reply: str

def generate_model_reply(prompt: Prompt, context: List[str] = []) -> str:
    try:
        response = requests.post(
            url=MODEL_SERVER,
            data=json.dumps({
                "context": context,
                "prompt": asdict(prompt)
            }),
            headers={ "Content-Type": "application/json" },
            # timeout=10
        )
        response.raise_for_status()
        d = response.json()

        return d["reply"]
    except Exception as e:
        Logger.log.error(str(e))
        return ""

def generate_embeddings(buffer: List[Any]) -> List[float]:
    try:
        response = requests.post(
            url=ENCODER_SERVER,
            data=json.dumps({
                "data": buffer
            }),
            headers={ "Content-Type": "application/json" },
            timeout=240
        )
        response.raise_for_status()
        d = response.json()
        return d["embeddings"]
    except Exception as e:
        Logger.log.error(str(e))
        return []
