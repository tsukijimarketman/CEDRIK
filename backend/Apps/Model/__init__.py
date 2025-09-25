from dataclasses import asdict, dataclass
from typing import List
from flask import Flask, jsonify, request
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline, set_seed
from backend.Lib.Common import Prompt, load_json
from backend.Lib.Logger import Logger
from backend.Lib.Config import AI_MODEL, PIPE_CONFIG, TOKENIZER_CONFIG, MAIN_PORT

app = Flask(__name__)

CORS(
  app,
  resources={
      r"/*": {
          "origins": [f"http://localhost:{MAIN_PORT}", f"http://127.0.0.1:{MAIN_PORT}"],
          "methods": ["POST"],
          "allow_headers": ["Content-Type", "application/json"],
          "expose_headers": ["Content-Type", "Content-Length", "Authorization"]
      }
  },
)

CHAT_TEMPLATE = {}
class Model:
    """
    Static helper class to communicate with the `Model`
    """
    __tokenizer = None
    __model = None
    __pipe = None

    if AI_MODEL == "distilbert/distilgpt2":
        __pipe = pipeline(
            "text-generation",
            model=AI_MODEL,
            trust_remote_code=True
        )
        set_seed(42)
    else:
        __tokenizer = AutoTokenizer.from_pretrained(AI_MODEL, trust_remote_code=True)
        __model = AutoModelForCausalLM.from_pretrained(AI_MODEL,
            device_map="auto",
            load_in_8bit=True,
            trust_remote_code=True
        )

    def __new__(cls, *args, **kwargs):
        raise Exception("Do not Instantiate Model")

    @classmethod
    def __generate_with_pipeline(cls, prompts: list[Prompt]):
        """
        For testing purposes only
        """

        config = load_json(PIPE_CONFIG)
        outputs = cls.__pipe(
            "\n".join(p.content for p in prompts),
            **config
        )

        return None, outputs

    @classmethod
    def __generate_with_tokenizer(cls, prompts: list[Prompt]):
        cls.__model.encode()
        config = load_json(TOKENIZER_CONFIG)
        inputs = cls.__tokenizer.apply_chat_template(
            [asdict(i) for i in prompts],
            **CHAT_TEMPLATE,
            **config
        ).to(cls.__model.device)

        Logger.log.info(str(inputs))
        outputs = cls.__model.generate(**inputs, max_new_tokens=128)

        return inputs, outputs
    
    @classmethod
    def generate(cls, prompts: list[Prompt]):
        if AI_MODEL ==  "distilbert/distilgpt2":
            return Model.__generate_with_pipeline(prompts)
        return Model.__generate_with_tokenizer(prompts)
    
    @classmethod
    def decode(cls, inputs, outputs):
        if AI_MODEL ==  "distilbert/distilgpt2":
            return outputs[0]["generated_text"]
        return cls.__tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:])

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
    inp, out = Model.generate(query)
    # apply context
    decoded = Model.decode(inp, out)
    decoded = decoded.replace(body.prompt.content, "", 1).strip()
    return jsonify({
      "reply": decoded
    }), 200;
  except Exception as e:
    Logger.log.error(str(e))