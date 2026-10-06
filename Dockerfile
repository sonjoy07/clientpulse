# ==============================================================================
# Stage 1: Dependencies
# ==============================================================================
FROM node:22-alpine AS dependencies

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# ==============================================================================
# Stage 2: Builder
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY src ./src/

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate
RUN npm run build
# Prune devDependencies to keep production node_modules minimal
RUN npm prune --omit=dev

# ==============================================================================
# Stage 3: Production Runner
# ==============================================================================
FROM node:22-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install openssl for Prisma query engine runtime and curl for container health checks
RUN apk add --no-cache openssl curl

# Set file ownership to non-root node user (uid: 1000)
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/prisma ./prisma

USER node

EXPOSE 4000

CMD ["node", "dist/main"]
