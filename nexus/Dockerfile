# Multi-stage build: smaller final image
FROM node:20-alpine AS base
WORKDIR /app

# Production dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build stage (installs all deps including dev)
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci

# Final production stage
FROM base AS runtime
# Add curl for health checks
RUN apk add --no-cache curl

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY src ./src
COPY package.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Expose port (can be overridden with -p flag)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/nodes || exit 1

# Start application
CMD ["node", "src/api/server.js"]
