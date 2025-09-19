import requests
import json
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline, set_seed
from sentence_transformers import SentenceTransformer, util
from backend.Logger import Logger
from dataclasses import dataclass, asdict
from numpy import ndarray, array as nparray
from backend.Utils import load_json
from backend.config import (
    DEFAULT_MODEL, DEFAULT_SENTENCE_TRANSFORMER,
    PIPE_CONFIG, TOKENIZER_CONFIG, ENCODER_PORT
)
from typing import Any, List

# Set model configurations
MODEL = DEFAULT_MODEL
SENTENCE_TRANSFORMER_MODEL = DEFAULT_SENTENCE_TRANSFORMER
CONFIG_PIPE = PIPE_CONFIG
CONFIG_TOKENIZER = TOKENIZER_CONFIG

CHAT_TEMPLATE = {}
# match MODEL:
#     case "distilbert/distilgpt2":
#         CHAT_TEMPLATE["chat_template"] ="{{content}}"

Logger.log.info(f"MODEL={MODEL}")
Logger.log.info(f"CHAT_TEMPLATE={CHAT_TEMPLATE}")

@dataclass
class Prompt:
    role: str
    content: str

@dataclass
class ModelReply:
    decoded: str
    inp: Any
    out: Any
    embeddings: List[float]

class ModelPipe:
    """
    Static helper class to communicate with the `MODEL`

    Use class `IModel` to interact with this class
    """
    __tokenizer = None
    __model = None
    __pipe = None
    __sentence_transformer = None
    # __sentence_transformer = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)

    # if MODEL == "distilbert/distilgpt2":
    #     __pipe = pipeline(
    #         "text-generation",
    #         model=MODEL,
    #         trust_remote_code=True
    #     )
    #     set_seed(42)
    # else:
    #     __tokenizer = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
    #     __model = AutoModelForCausalLM.from_pretrained(MODEL,
    #         device_map="auto",
    #         load_in_8bit=True,
    #         trust_remote_code=True
    #     )

    def __new__(cls, *args, **kwargs):
        raise Exception("Do not Instantiate ModelPipe")

    # @classmethod
    # def get_pipe(cls):
    #     return cls.__pipe

    @classmethod
    def __generate_with_pipeline(cls, prompts: list[Prompt]):
        """
        For testing purposes only
        """

        config = load_json(CONFIG_PIPE)
        outputs = cls.__pipe(
            "\n".join(p.content for p in prompts),
            **config
        )

        return None, outputs

    @classmethod
    def __generate_with_tokenizer(cls, prompts: list[Prompt]):
        cls.__model.encode()
        config = load_json(CONFIG_PIPE)
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
        if MODEL ==  "distilbert/distilgpt2":
            return ModelPipe.__generate_with_pipeline(prompts)
        return ModelPipe.__generate_with_tokenizer(prompts)
    
    @classmethod
    def decode(cls, inputs, outputs):
        if MODEL ==  "distilbert/distilgpt2":
            return outputs[0]["generated_text"]
        return cls.__tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:])

    # @classmethod
    # def get_embeddings_from(cls, buffer: ndarray) -> List[float]:
    #     try:
    #         embeddings = cls.__sentence_transformer.encode(buffer)
    #         return embeddings.tolist()
    #     except Exception as e:
    #         Logger.log.error(e)
    #     return []

    # @classmethod
    # def get_embeddings(cls, prompt: Prompt) -> List[float]:
    #     try:
    #         return ModelPipe.get_embeddings_from(nparray([prompt.content]))
    #     except Exception as e:
    #         Logger.log.error(e)
    #     return []

class IModel:
    def __init__(self, prompt: Prompt, context: List[str] = []):
        self.__prompt = prompt
        self.__context = context

    def generate_reply(self):
        """
        Generate a model reply for the current prompt.

        Calls `ModelPipe.generate` with the prompt, decodes the output, 
        and returns the results.

        Returns:
            `ModelReply`
        """
        embeddings = generate_embeddings([self.__prompt.content])
        query = [Prompt(role="context", content=i) for i in self.__context]
        query.append(self.__prompt)
        # inp, out = ModelPipe.generate(query)
        inp, out = "test", "test"
        # decoded = ModelPipe.decode(inp, out)
        # decoded = decoded.replace(self.__prompt.content, "", 1).strip()
        decoded = "reply"
        return ModelReply(
            decoded=decoded,
            inp = inp,
            out = out,
            embeddings = embeddings
        )

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