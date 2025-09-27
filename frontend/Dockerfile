FROM node:24-bookworm-slim

WORKDIR /app/


ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/userapp" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

RUN chown -R appuser:appuser /app

USER appuser

COPY ./package.json .
RUN npm i

COPY . .

CMD [ "npm", "run", "dev", "--", "--host", "0.0.0.0" ]
