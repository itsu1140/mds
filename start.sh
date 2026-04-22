#!/bin/sh
set -e
envsubst '${ROOT_PATH}' < /etc/nginx/nginx.conf.template > /etc/nginx/http.d/default.conf
node /app/dist/index.js &
exec nginx -g 'daemon off;'
