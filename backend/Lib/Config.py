import os
from typing import Any, Callable
from dotenv import load_dotenv
load_dotenv()

def _get_env_or_default(env_name: str, default: Any, transform: Callable | None = None):
  env = os.getenv(env_name)
  if env == None or len(env) == 0:
    return default
  if transform:
    try:
      return transform(env)
    except Exception as _:
      return default
  return env

def _get_required_env(env_name: str):
  v = os.getenv(env_name)
  if v == None or len(v) == 0:
    raise Exception(f"env {env_name} not set")
  return v

def _get_env_as_path(env_name: str):
  v = os.getenv(env_name)
  if v == None or len(v) == 0:
    raise Exception(f"env {env_name} not set")
  if not os.path.exists(v):
    raise FileNotFoundError()
  return v

# Model
AI_MODEL = str(_get_required_env("AI_MODEL"))
FILTER_MODE = bool(_get_env_or_default("FILTER_MODE", False, lambda x: x != None and (x == '1' or x.lower() == "true")))
SENTENCE_TRANSFORMER_MODEL = str(_get_required_env("SENTENCE_TRANSFORMER_MODEL"))
# Pipeline Configuration
PIPE_CONFIG = str(_get_env_as_path("PIPE_CONFIG"))
TOKENIZER_CONFIG = str(_get_env_as_path("TOKENIZER_CONFIG"))

MAX_CONTENT_LENGTH = int(_get_env_or_default("MAX_CONTENT_LENGTH",10*1024*1024, lambda x: int(x)))
MAX_CONTEXT_SIZE = int(_get_env_or_default("MAX_CONTEXT_SIZE", 5, lambda x: int(x)))
MAIN_SERVER = str(_get_env_or_default("SERVER_MAIN", "http://localhost:5000"))
ENCODER_SERVER = str( _get_env_or_default("SERVER_ENCODER" , "http://localhost:5001/encode") )
MODEL_SERVER = str( _get_env_or_default("SERVER_MODEL", "http://localhost:5002/generate-reply") )
FILTER_SERVER = str( _get_env_or_default("SERVER_FILTER", "http://localhost:5003/generate-reply") )
FRONTEND_SERVER = str( _get_env_or_default("SERVER_FRONTEND", "http://localhost:5173") )
DATABASE_URI = str(_get_required_env("CyberSync_DatabaseUri"))
JWT_SECRET = str(_get_required_env("JWT_SECRET"))
RESOURCE_DIR = str(_get_env_or_default("RESOURCE_DIR", "Uploads/"))

LLAMA_SERVER = os.getenv("LLAMA_SERVER")
if AI_MODEL == "llama" and (LLAMA_SERVER == None or len(LLAMA_SERVER) == 0):
  raise Exception("LLAMA_SERVER is not set but AI_MODEL is set to llama")

HF_TOKEN = str(_get_env_or_default("HF_TOKEN", ""))

CHUNK_SIZE_BYTES = int(_get_env_or_default("CHUNK_SIZE_BYTES", 256, lambda x:  int(x)))
CHUNK_OFFSET_BYTES = int(_get_env_or_default("CHUNK_OFFSET_BYTES", 28, lambda x:  int(x)))
DEBUG = bool(_get_env_or_default("DEBUG", False, lambda x: x != None or len(x) > 0))
AI_NAME = str(_get_env_or_default("AI_NAME", "CEDRIK"))
