FROM python:3.13-slim-bookworm

WORKDIR /app/

RUN --mount=type=cache,mode=0755,target=/root/.cache/pip \
    pip install transformers sentence-transformers

CMD ["/bin/bash"]
