import os

# Model
DEFAULT_MODEL = os.getenv(os.getenv("CURRENT_MODEL_KEY"))
if DEFAULT_MODEL == None or len(DEFAULT_MODEL) == 0:
  raise Exception("DEFAULT_MODEL is not set")

DEFAULT_SENTENCE_TRANSFORMER = os.getenv(os.getenv("CURRENT_SENTENCE_TRANSFORMER_MODEL_KEY"))
if DEFAULT_SENTENCE_TRANSFORMER == None or len(DEFAULT_SENTENCE_TRANSFORMER) == 0:
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

FILE_SIZE_LIMIT_MB = 10
file_size_limit_mb = os.getenv("FILE_SIZE_LIMIT_MB")
if file_size_limit_mb == None or len(file_size_limit_mb) > 0:
  try:
    FILE_SIZE_LIMIT_MB = int(file_size_limit_mb)
  except Exception as _:
    pass

MAX_CONTEXT_SIZE = 5
max_context_size = os.getenv("MAX_CONTEXT_SIZE")
if max_context_size != None and len(max_context_size) > 0:
  try:
    MAX_CONTEXT_SIZE = int(max_context_size)
  except Exception as _:
    pass