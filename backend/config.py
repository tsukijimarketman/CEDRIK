import os

# Model
DEFAULT_MODEL = os.getenv(os.getenv("CURRENT_MODEL_KEY"))
DEFAULT_SENTENCE_TRANSFORMER = os.getenv(os.getenv("CURRENT_SENTENCE_TRANSFORMER_MODEL_KEY"))

# Pipeline Configuration
PIPE_CONFIG = os.getenv("PIPE_CONFIG")
TOKENIZER_CONFIG = os.getenv("TOKENIZER_CONFIG")
