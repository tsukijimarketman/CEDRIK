from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline, set_seed
from backend.Logger import Logger
from dataclasses import dataclass, asdict
from backend.Utils import load_json
from typing import Tuple, Any
import os

CONFIG_PIPE = os.getenv("PIPE_CONFIG")
CONFIG_TOKENIZER = os.getenv("TOKENIZER_CONFIG")
MODEL = os.getenv("TEST_MODEL")
if MODEL == None:
    raise Exception("AI Model is Empty")

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

class ModelPipe:
    """
    Static helper class to communicate with the `MODEL`

    Use class `IModel` to interact with this class
    """
    __tokenizer = None
    __model = None
    __pipe = None

    if MODEL == "distilbert/distilgpt2":
        __pipe = pipeline(
            "text-generation",
            model=MODEL,
            trust_remote_code=True
        )
        set_seed(42)
    else:
        __tokenizer = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
        __model = AutoModelForCausalLM.from_pretrained(MODEL,
            device_map="auto",
            load_in_8bit=True,
            trust_remote_code=True
        )

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

    @classmethod
    def get_embeddings(cls, inputs, outputs):
        raise NotImplementedError("get_embeddings")

class IModel:
    def __init__(self, prompt):
        if isinstance(prompt, IModel):
            self.__prompt = prompt.__prompt
            return

        self.__prompt = prompt

    def generate_reply(self) -> Tuple[ str, Any, Any ]:
        """
        Generate a model reply for the current prompt.

        Calls `ModelPipe.generate` with the prompt, decodes the output, 
        and returns the results.

        Returns:
            tuple: A 3-tuple containing:
                - decoded (str): The decoded text of the model's reply.
                - inp (Any): The input representation used by the model.
                - out (Any): The raw output from the model.
        """
        inp, out = ModelPipe.generate([self.__prompt])
        decoded = ModelPipe.decode(inp, out)

        return decoded, inp, out