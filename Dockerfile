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
WORKDIR /app
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/package.json ./
RUN npm install --omit=dev
COPY --from=frontend-builder /app/dist ./public

EXPOSE 50003
ENV DATA_DIR=/app/data
ENV PORT=50003

CMD ["node", "dist/index.js"]
