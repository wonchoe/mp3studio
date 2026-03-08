FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8765

EXPOSE 8765

CMD ["node", "server.js"]