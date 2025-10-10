FROM node:24-bookworm-slim

WORKDIR /app/


ARG UID=1001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/userapp" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

RUN chown -R ${UID}:${UID} /app

USER appuser

COPY --chown=${UID}:${UID} ./package.json .
RUN npm i

COPY --chown=${UID}:${UID} . .

CMD [ "npm", "run", "dev", "--", "--host", "0.0.0.0" ]
