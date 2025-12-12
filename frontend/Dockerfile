FROM node:24-alpine AS builder

WORKDIR /app/

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
COPY ./.env /app/.env

CMD [ "/bin/bash" ]
FROM nginx:stable-bookworm

COPY --from=builder /app/dist/ /usr/share/nginx/html/

CMD [ "/bin/bash" ]
