FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY create-topics.js ./

CMD ["node", "create-topics.js"]
