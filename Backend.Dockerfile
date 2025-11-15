FROM python:3.13-slim-bookworm

WORKDIR /app/

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN --mount=type=cache,mode=0755,target=/root/.cache/pip \
    pip install torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install transformers sentence-transformers

CMD ["/bin/bash"]
