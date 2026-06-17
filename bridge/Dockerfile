FROM node:20-alpine

WORKDIR /app

# busybox fournit stty (utilise pour passer la tty en mode raw avant lecture).
# Pas besoin de l'installer explicitement sur alpine — deja present.

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

CMD ["node", "server.js"]
