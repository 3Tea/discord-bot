ARG BUILD_PLATFORM=linux/amd64

# Build stage
FROM --platform=${BUILD_PLATFORM} node:24-alpine AS builder

RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM --platform=${BUILD_PLATFORM} node:24-alpine

RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && \
    apk del make g++ gcc

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs && chown -R node:node logs

USER node

CMD ["node", "dist/bin/www.js"]
