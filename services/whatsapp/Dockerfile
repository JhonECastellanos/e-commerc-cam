FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production PUPPETEER_SKIP_DOWNLOAD=true CHROME_PATH=/usr/bin/chromium
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /data/home && chown -R 10000:10000 /data
COPY . .
ENV HOME=/data/home
USER 10000:10000
EXPOSE 3210
CMD ["node","server.js"]
