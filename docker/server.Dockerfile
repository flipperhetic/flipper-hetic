FROM node:20-bookworm-slim

WORKDIR /app
COPY . .
RUN npm ci

EXPOSE 3000
CMD ["npm", "run", "dev", "-w", "server"]
