from dataclasses import asdict, dataclass
import requests
import json
from backend.Lib.Logger import Logger
from backend.Lib.Common import Prompt
from backend.Lib.Config import ENCODER_PORT, MODEL_PORT
from typing import Any, List

@dataclass
class Reply:
    prompt: Prompt
    embeddings: List[float]
    reply: str

def generate_model_reply(prompt: Prompt, context: List[str] = []) -> str:
    try:
        query = [Prompt(role="context", content=i) for i in context]

        response = requests.post(
            url=f"http://localhost:{MODEL_PORT}/generate-reply",
            data=json.dumps({
                "context": query,
                "prompt": asdict(prompt)
            }),
            headers={ "Content-Type": "application/json" }
        )
        response.raise_for_status()
        d = response.json()

        return d["reply"]
    except Exception as e:
        Logger.log.error(str(e))
        return ""

def generate_embeddings(buffer: List[Any]):
    try:
        response = requests.post(
            url=f"http://localhost:{ENCODER_PORT}/encode",
            data=json.dumps({
                "data": buffer
            }),
            headers={
                "Content-Type": "application/json"
            }
        )
        response.raise_for_status()
        d = response.json()
        return d["embeddings"]
    except Exception as e:
        Logger.log.error(str(e))
        return []