FROM node:20-bookworm-slim

WORKDIR /app
COPY . .
RUN npm ci

EXPOSE 5174
CMD ["npm", "run", "dev", "-w", "backglass"]
