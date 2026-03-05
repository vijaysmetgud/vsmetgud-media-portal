#!/bin/sh

echo "Generating media index..."

cd /usr/share/nginx/html

echo "[" > media-index.json

find media -type f | sed 's|media/||' | sed 's|^|"|' | sed 's|$|",|' >> media-index.json

sed -i '$ s/,$//' media-index.json

echo "]" >> media-index.json

echo "Media index created"

nginx -g 'daemon off;'