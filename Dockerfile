FROM node:20-alpine

WORKDIR /usr/src/app

# INSTALL REQUIRED PACKAGES
RUN apk add --no-cache \
    curl \
    bash

# INSTALL kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# COPY PACKAGE FILE
COPY package.json ./

# INSTALL NODE MODULES
RUN npm install --production

# COPY APPLICATION FILES
COPY app/ .
COPY server.js ./

EXPOSE 8080

CMD ["npm", "start"]