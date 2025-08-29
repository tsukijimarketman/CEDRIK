from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline, set_seed
from backend.Logger import Logger
from dataclasses import dataclass, asdict
from backend.Utils import load_json
from typing import Tuple, Any
import os

CONFIG = load_json(os.getenv("PIPE_CONFIG"))
MODEL = os.getenv("TEST_MODEL")
if MODEL == None:
    raise Exception("AI Model is Empty")

CHAT_TEMPLATE = {}
# match MODEL:
#     case "distilbert/distilgpt2":
#         CHAT_TEMPLATE["chat_template"] ="{{content}}"

Logger.log.info(f"CONFIG={CONFIG}")
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
    __tokenizer = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
    __model = AutoModelForCausalLM.from_pretrained(MODEL,
        device_map="auto",
        load_in_8bit=True,
        trust_remote_code=True
    )
    __pipe = pipeline(
        "text-generation",
        model=MODEL,
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
        set_seed(42)
        inputs = cls.__pipe(
            "\n".join(p.content for p in prompts),
            max_new_tokens=120,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.1,
            pad_token_id=50256
        )

        return inputs, inputs

    @classmethod
    def generate(cls, prompts: list[Prompt]):
        if MODEL ==  "distilbert/distilgpt2":
            return ModelPipe.__generate_with_pipeline(prompts)
        inputs = None
        # if MODEL ==  "distilbert/distilgpt2":
        #     # distilgpt2 doesn't have
        #     inputs = cls.__tokenizer(
        #         "\n".join(p.content for p in prompts),
        #         return_tensors="pt"
        #     )
        # else:
        inputs = cls.__tokenizer.apply_chat_template(
            [asdict(i) for i in prompts],
            **CHAT_TEMPLATE,
            **CONFIG
        ).to(cls.__model.device)

        Logger.log.info(str(inputs))
        outputs = cls.__model.generate(**inputs, max_new_tokens=128)

        return inputs, outputs
    
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