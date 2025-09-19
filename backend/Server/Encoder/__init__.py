from numpy import ndarray
from sentence_transformers import SentenceTransformer
from numpy import ndarray
from flask import Flask, request, jsonify
from backend.Logger import Logger
from backend.config import DEFAULT_SENTENCE_TRANSFORMER
from typing import List, Any

app = Flask("Encoder")

class Encoder:
  __sentence_transformer = SentenceTransformer(DEFAULT_SENTENCE_TRANSFORMER)

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