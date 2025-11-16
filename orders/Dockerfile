FROM node:alpine

WORKDIR /app
COPY package.json .
RUN npm install --only=prod
COPY . .

RUN npx prisma generate

CMD ["npm", "start"]
