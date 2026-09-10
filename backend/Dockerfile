FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .

FROM node:20-alpine AS production

RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    apk add --no-cache dumb-init

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/src ./src

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]