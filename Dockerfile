FROM node:20-alpine

WORKDIR /app

COPY backend/package.json ./

RUN npm install

COPY backend/ ./

RUN npm run build && npm prune --omit=dev

EXPOSE 3001

CMD ["npm", "start"]