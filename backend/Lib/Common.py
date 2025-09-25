from dataclasses import dataclass
import json

@dataclass
class Prompt:
  role: str
  content: str

def load_json(filename):
    if (len(filename) == 0):
        raise FileNotFoundError()

    with open(filename, "r") as f:
        data = json.load(f)
        return data