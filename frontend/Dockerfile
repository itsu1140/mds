FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG ROOT_PATH=/
ENV ROOT_PATH=$ROOT_PATH
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template
ENV ROOT_PATH=/
CMD ["/bin/sh", "-c", "envsubst '${ROOT_PATH}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
