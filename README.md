## Discord bot using Discord.js version 14

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB
- Redis
- Discord Bot Token ([Developer Portal](https://discord.com/developers/applications))

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your DISCORD_TOKEN, CLIENT_ID, GUILD_ID, DB_URL, REDIS_URL
```

### Run Locally

```bash
npm install
npm run start:dev
```

### Build & Run (Production)

```bash
npm run build
npm start
```

## Docker

### Build

```bash
docker build -t 3at-discord-bot .
```

### Run

```bash
docker run -d --env-file .env --name 3at-bot 3at-discord-bot
```

### Docker Compose (with MongoDB + Redis)

```yaml
# docker-compose.yml
version: "3.8"
services:
  bot:
    build: .
    env_file: .env
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

When using Docker Compose, set in `.env`:
```
DB_URL=mongodb://mongo:27017/discord-bot
REDIS_URL=redis://redis:6379/4
```

Then run:
```bash
docker compose up -d
```

## Powered by

[![DS112](https://i.imgur.com/iXgnqXG.png)](https://github.com/3Tea)
