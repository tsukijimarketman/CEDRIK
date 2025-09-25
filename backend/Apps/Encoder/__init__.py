from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from flask import Flask, request, jsonify
from backend.Lib.Logger import Logger
from backend.Lib.Config import SENTENCE_TRANSFORMER_MODEL, MAIN_PORT
from typing import List, Any

app = Flask(__name__)

CORS(
  app,
  resources={
      r"/*": {
          "origins": ["http://localhost:{MAIN_PORT}", "http://127.0.0.1:{MAIN_PORT}"],
          "methods": ["POST"],
          "allow_headers": ["Content-Type", "application/json"],
          "expose_headers": ["Content-Type", "Content-Length", "Authorization"]
      }
  },
)

class Encoder:
  __sentence_transformer = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)

  @classmethod
  def encode(cls, data: List[Any]):
    try:
      embeddings = cls.__sentence_transformer.encode(data)
      return embeddings.tolist()
    except Exception as e:
      Logger.log.error(str(e))
      return []


@app.route("/encode", methods=["POST"])
def encode():
  """
  body format
  {
    data: str
  }
  """
  try:
    data = request.get_json()
    buffer = list(data["data"])
    if len(buffer) == 0:
      raise Exception()
    embeddings = Encoder.encode(buffer)
    if len(embeddings) > 0:
      embeddings = embeddings[0]
    return jsonify({
      "embeddings": embeddings
    }), 200
  except Exception as e:
    Logger.log.error(str(e))
    return jsonify({ "error": "cannot encode data" }), 400