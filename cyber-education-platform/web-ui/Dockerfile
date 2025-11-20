# FROM nginx:alpine
# COPY index.html /usr/share/nginx/html/
# EXPOSE 80

FROM node:20-alpine as build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
