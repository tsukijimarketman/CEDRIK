import os

# Model
DEFAULT_MODEL = os.getenv(os.getenv("CURRENT_MODEL_KEY"))
if len(DEFAULT_MODEL) == 0:
  raise Exception("DEFAULT_MODEL is not set")
DEFAULT_SENTENCE_TRANSFORMER = os.getenv(os.getenv("CURRENT_SENTENCE_TRANSFORMER_MODEL_KEY"))
if len(DEFAULT_SENTENCE_TRANSFORMER) == 0:
  raise Exception("DEFAULT_SENTENCE_TRANSFORMER is not set")

# Pipeline Configuration
PIPE_CONFIG = os.getenv("PIPE_CONFIG")
TOKENIZER_CONFIG = os.getenv("TOKENIZER_CONFIG")

FILE_SIZE_LIMIT_MB = 10
file_size_limit_mb = os.getenv("FILE_SIZE_LIMIT_MB")
if file_size_limit_mb == None or len(file_size_limit_mb) > 0:
  FILE_SIZE_LIMIT_MB = int(FILE_SIZE_LIMIT_MB)