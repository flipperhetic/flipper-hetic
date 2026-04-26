FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json
COPY playfield/package.json ./playfield/package.json
COPY backglass/package.json ./backglass/package.json
COPY dmd/package.json ./dmd/package.json

RUN npm ci --workspace=playfield

COPY shared/ ./shared/
COPY playfield/ ./playfield/

EXPOSE 5173
WORKDIR /app/playfield
CMD ["../node_modules/.bin/vite", "--host"]
