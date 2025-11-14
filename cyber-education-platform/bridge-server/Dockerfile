FROM node:18-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js .
COPY rag-manager.js .

EXPOSE 3000

CMD ["node", "server.js"]
