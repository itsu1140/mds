FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ .
ARG ROOT_PATH=/mds
ENV ROOT_PATH=$ROOT_PATH
RUN npm run build

FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache nginx

WORKDIR /app
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/package.json ./
RUN npm install --omit=dev

COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY /etc/nginx/nginx.conf.template

EXPOSE 50003
ENV DATA_DIR=/app/data

CMD ["./start.sh"]
