# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build server first, then client (client outputs to server/dist/public)
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy built files and production node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/index.js"]
