## Multi-stage Dockerfile for monorepo: build client then run server
FROM node:20 AS deps
WORKDIR /app

# Copy root and workspace package files for dependency install
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/

# Install production deps only (CI style)
RUN npm ci --omit=dev

FROM node:20 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the client
RUN npm run build:client

FROM node:20-slim AS prod
WORKDIR /app

# Copy server and built client
COPY --from=build /app/server ./server
COPY --from=build /app/client/build ./client/build
COPY --from=build /app/node_modules ./node_modules

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
