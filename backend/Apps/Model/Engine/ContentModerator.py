from backend.Lib.Logger import Logger
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from dataclasses import asdict
from typing import List

from backend.Lib.Common import Prompt, load_json
from backend.Lib.Config import TOKENIZER_CONFIG
from .Base import LLMEngine

class ContentModerator(LLMEngine):
  def __init__(self):
    super().__init__("Vrandan/Comment-Moderation")
    self._tokenizer = AutoTokenizer.from_pretrained(self.model, trust_remote_code=True)
    self._model = AutoModelForSequenceClassification.from_pretrained(self.model, trust_remote_code=True)

  def generate(self, query: List[Prompt]) -> str:
    inputs = self._tokenizer("\n".join([ i.content for i in query]), return_tensors="pt")
    outputs = self._model(**inputs)
    probabilities = outputs.logits.softmax(dim=-1).squeeze()
    
    labels = [self._model.config.id2label[i] for i in range(len(probabilities))]
    predictions = sorted(zip(labels, probabilities), key=lambda x: x[1], reverse=True)
    Logger.log.info(f"PREDICTIONS FILTER {predictions}")

    if len(predictions) == 0:
      return "OK"

    return predictions[0][0]