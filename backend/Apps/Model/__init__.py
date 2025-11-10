from dataclasses import dataclass
from typing import List
from flask import Flask, jsonify, request
from flask_cors import CORS
from backend.Apps.Model.Engine import DeepSeekV3, DistilGPT2, LLMEngine, LLamaServer, Qwen, ContentModerator, InferenceQwen, GroqEngine
from backend.Lib.Common import Prompt
from backend.Lib.Logger import Logger
from backend.Lib.Config import AI_MODEL, FILTER_MODE, MAIN_SERVER
import traceback

app = Flask(__name__)

CORS(
  app,
  resources={
      r"/*": {
          "origins": [MAIN_SERVER],
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

    Logger.log.info(f"ai_model={AI_MODEL} filter_mode={FILTER_MODE}")
    if FILTER_MODE:
      _engine = ContentModerator()    
    elif AI_MODEL == "groq":  
      _engine = GroqEngine()
    elif AI_MODEL == "inference_qwen":
      _engine = InferenceQwen()
    elif AI_MODEL == "deepseek-ai":
      _engine = DeepSeekV3()
    elif AI_MODEL == "llama":
      _engine = LLamaServer()
    elif AI_MODEL == "qwen":
      _engine = Qwen()
    else:
      _engine = DistilGPT2()

    def __new__(cls, *args, **kwargs):
        raise Exception("Do not Instantiate Model")
    
    @classmethod
    def generate(cls, query: List[Prompt], overrides: dict = {}) -> str:
        return cls._engine.generate(query, overrides)

@dataclass
class GenerateReplyBody:
    prompt: Prompt
    context: List[str]
    conversation_history: List[dict] = None  # ← NEW
    overrides: dict | None = None
    
    def __post_init__(self):
        self.prompt = Prompt(**self.prompt)
        if self.conversation_history is None:
            self.conversation_history = []

@app.route("/generate-reply", methods=["POST"])
def generate_reply():
  try:
    body = GenerateReplyBody(**request.get_json())
    if body.overrides == None:
      body.overrides = {}

    query = []
    
    # 1. Add knowledge base context as system message
    if body.context and len(body.context) > 0:
      context_text = "\n\n".join([
        f"Reference {i+1}: {text}" 
        for i, text in enumerate(body.context)
      ])
      query.append(Prompt(
        role="system", 
        content=f"Relevant information from knowledge base:\n\n{context_text}"
      ))
    
    # 2. Add conversation history (maintains flow)
    for msg in body.conversation_history:
      query.append(Prompt(
        role=msg["role"],
        content=msg["content"]
      ))
    
    # 3. Add current user prompt
    query.append(body.prompt)

    Logger.log.info(f"Full conversation query: {len(query)} messages")
    reply = Model.generate(query, body.overrides)

    Logger.log.info(f"reply {reply}")
    return jsonify({
      "reply": reply
    }), 200
  except Exception as e:
    Logger.log.error(repr(e))
    return jsonify({"error": str(e)}), 500
