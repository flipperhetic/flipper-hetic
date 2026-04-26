FROM node:20-bookworm-slim

WORKDIR /app
COPY . .
RUN npm ci

EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "playfield"]
