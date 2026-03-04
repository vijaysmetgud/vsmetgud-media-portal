FROM nginx:stable-alpine

COPY app/ /usr/share/nginx/html/
COPY media-index.json /usr/share/nginx/html/
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
