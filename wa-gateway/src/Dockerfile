FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    TZ=Asia/Jakarta

# Baileys 6.x menarik satu dependensi lewat git, jadi git wajib ada saat install.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY src ./src

RUN mkdir -p /data/auth

EXPOSE 8099

CMD ["node", "src/index.js"]