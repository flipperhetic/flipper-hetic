FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json
COPY playfield/package.json ./playfield/package.json
COPY backglass/package.json ./backglass/package.json
COPY dmd/package.json ./dmd/package.json

RUN npm ci --workspace=backglass

COPY shared/ ./shared/
COPY backglass/ ./backglass/

EXPOSE 5174
WORKDIR /app/backglass
CMD ["../node_modules/.bin/vite", "--host"]
