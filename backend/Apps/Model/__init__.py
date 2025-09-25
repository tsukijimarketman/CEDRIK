from dataclasses import dataclass
from typing import List
from flask import Flask, jsonify, request
from flask_cors import CORS
from backend.Apps.Model.Engine import DeepSeekV3, DistilGPT2, LLMEngine
from backend.Lib.Common import Prompt
from backend.Lib.Logger import Logger
from backend.Lib.Config import AI_MODEL, MAIN_PORT

app = Flask(__name__)

CORS(
  app,
  resources={
      r"/*": {
          "origins": [f"http://localhost:{MAIN_PORT}", f"http://127.0.0.1:{MAIN_PORT}"],
          "methods": ["POST"],
          "allow_headers": ["Content-Type", "application/json"],
      }
  },
)

CHAT_TEMPLATE = {}
class Model:
    """
    Static helper class to communicate with the `Model`
    """
    _engine: LLMEngine = LLMEngine("")

    if AI_MODEL == "distilbert/distilgpt2":
        _engine = DistilGPT2()
    else:
        _engine = DeepSeekV3()

    def __new__(cls, *args, **kwargs):
        raise Exception("Do not Instantiate Model")
    
    @classmethod
    def generate(cls, query: List[Prompt]) -> str:
        return cls._engine.generate(query)

@dataclass
class GenerateReplyBody:
    prompt: Prompt
    context: List[str]
    def __post_init__(self):
        self.prompt = Prompt(**self.prompt)

@app.route("/generate-reply", methods=["POST"])
def generate_reply():
  """
  body format
  {
    context: List[str]
    prompt: {
      role: str,
      content: str
    }
  }

  returns
  {
    reply: str
  }
  """
  try:
    body = GenerateReplyBody(**request.get_json())
    query = [Prompt(role="context", content=i) for i in body.context]
    query.append(body.prompt)

    reply = Model.generate(query)

    return jsonify({
      "reply": reply
    }), 200;
  except Exception as e:
    Logger.log.error(str(e))