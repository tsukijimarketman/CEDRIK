import os
from dotenv import load_dotenv
load_dotenv()

def _get_env_or_default(env_name, default, transform = None):
  env = os.getenv(env_name)
  if env == None or len(env) == 0:
    return default
  if transform:
    try:
      return transform(env)
    except Exception as _:
      return default
  return env

# Model
AI_MODEL = os.getenv("AI_MODEL")
if AI_MODEL == None or len(AI_MODEL) == 0:
  raise Exception("DEFAULT_MODEL is not set")

SENTENCE_TRANSFORMER_MODEL = os.getenv("SENTENCE_TRANSFORMER_MODEL")
if SENTENCE_TRANSFORMER_MODEL == None or len(SENTENCE_TRANSFORMER_MODEL) == 0:
  raise Exception("DEFAULT_SENTENCE_TRANSFORMER is not set")

# Pipeline Configuration
PIPE_CONFIG = os.getenv("PIPE_CONFIG")
if PIPE_CONFIG == None or len(PIPE_CONFIG) == 0:
  raise Exception("PIPE_CONFIG not set")
if not os.path.exists(PIPE_CONFIG):
  raise FileNotFoundError()

TOKENIZER_CONFIG = os.getenv("TOKENIZER_CONFIG")
if TOKENIZER_CONFIG == None or len(TOKENIZER_CONFIG) == 0:
  raise Exception("TOKENIZER_CONFIG not set")
if not os.path.exists(TOKENIZER_CONFIG):
  raise FileNotFoundError()

FILE_SIZE_LIMIT_MB = _get_env_or_default("FILE_SIZE_LIMIT_MB",10, lambda x: int(x))
MAX_CONTEXT_SIZE = _get_env_or_default("MAX_CONTEXT_SIZE",5, lambda x: int(x))
MAIN_SERVER = _get_env_or_default("SERVER_MAIN", "http://localhost:5000")
ENCODER_SERVER = _get_env_or_default("SERVER_ENCODER" , "http://localhost:5001/encode")
MODEL_SERVER = _get_env_or_default("SERVER_MODEL", "http://localhost:5002/generate-reply")
DATABASE_URI = os.getenv("CyberSync_DatabaseUri")

if DATABASE_URI == None or len(DATABASE_URI) == 0:
  raise Exception("CyberSync_DatabaseUri not set")

JWT_SECRET = os.getenv("JWT_SECRET")
if JWT_SECRET == None or len(JWT_SECRET) == 0:
  raise Exception("JWT_SECRET not set")

RESOURCE_DIR = _get_env_or_default("RESOURCE_DIR", "Uploads/")

LLAMA_SERVER = os.getenv("LLAMA_SERVER")
if AI_MODEL == "llama" and (LLAMA_SERVER == None or len(LLAMA_SERVER) == 0):
  raise Exception("LLAMA_SERVER is not set but AI_MODEL is set to llama")
