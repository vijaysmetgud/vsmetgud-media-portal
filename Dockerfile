FROM nginx:stable-alpine

COPY app/ /usr/share/nginx/html/
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]