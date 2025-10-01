# ------------ build base ------------
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl

# ------------ deps  ------------
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ------------ runtime ------------
FROM base AS runtime
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
