FROM maasuncion/cedrik-base:1

WORKDIR /app/

COPY ./requirements.txt ./
RUN --mount=type=cache,mode=0755,target=/root/.cache/pip \
    pip install -r requirements.txt && pip install PyPDF2 python-docx python-pptx openpyxl

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

RUN chown -R appuser:appuser /app

USER appuser

COPY ./backend ./backend

# !!! override CMD in compose
CMD ["/bin/bash"]
