FROM maasuncion/cedrik-base:1 AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt ./
RUN --mount=type=cache,mode=0755,target=/root/.cache/pip \
    pip install -r requirements.txt && \
    pip install groq>=0.4.0

# ↑ Removed uwsgi install - you're not using it anyway!

FROM python:3.13-slim-bookworm
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY --from=builder /usr/local/include/ /usr/local/include/
COPY --from=builder /usr/local/lib/python3.13/ /usr/local/lib/python3.13/

RUN apt-get update && apt-get install -y libexpat1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/

ARG UID=1001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

RUN chown -R 1001:1001 /app

USER appuser

#COPY --chown=appuser:appuser ./backend ./backend

CMD ["/bin/bash"]