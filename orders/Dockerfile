FROM node:20-slim

WORKDIR /app

ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

RUN npx prisma generate

RUN npm prune --omit=dev

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
