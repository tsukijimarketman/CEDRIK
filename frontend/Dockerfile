FROM node:24-alpine AS builder

WORKDIR /app/

COPY package.json package-lock.json ./
RUN npm ci

COPY ./.env /app/.env
COPY . .
RUN npm run build

CMD [ "/bin/sh" ]
FROM nginx:stable-bookworm

COPY --from=builder /app/dist/ /usr/share/nginx/html/
COPY --from=builder /app/nginx/default.conf /etc/nginx/conf.d/default.conf

CMD [ "/bin/sh" ]
