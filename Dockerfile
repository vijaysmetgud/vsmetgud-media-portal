# ================= BUILD STAGE =================

FROM node:20-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

ENV PYTHON=/usr/bin/python3

COPY package*.json ./

RUN npm ci --omit=dev

COPY app/ .
COPY server.js ./

# ================= RUNTIME STAGE =================

FROM node:20-alpine

WORKDIR /usr/src/app

# Install ONLY required runtime tools
RUN apk add --no-cache \
    ffmpeg \
    curl \
    bash

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

COPY --from=builder /usr/src/app ./

EXPOSE 8080

CMD ["npm", "start"]