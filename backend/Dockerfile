# syntax=docker/dockerfile:1
FROM node:20.15.0-alpine3.20 AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

# ─── Final image ──────────────────────────────────────────────────────────────
FROM node:20.15.0-alpine3.20 AS runner

# Create non-root user
RUN addgroup -g 1001 -S bloomlater && \
    adduser -u 1001 -S bloomlater -G bloomlater

WORKDIR /app

# Copy only production deps and source
COPY --from=builder --chown=bloomlater:bloomlater /app/node_modules ./node_modules
COPY --chown=bloomlater:bloomlater . .

# Create uploads directory
RUN mkdir -p /app/uploads && chown bloomlater:bloomlater /app/uploads

USER bloomlater

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "server.js"]
