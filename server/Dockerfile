FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json
COPY playfield/package.json ./playfield/package.json
COPY backglass/package.json ./backglass/package.json
COPY dmd/package.json ./dmd/package.json

RUN npm ci --workspace=server

COPY shared/ ./shared/
COPY server/ ./server/

EXPOSE 3000
CMD ["node", "server/src/index.js"]
