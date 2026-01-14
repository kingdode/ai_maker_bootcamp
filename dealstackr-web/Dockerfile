# Multi-stage Dockerfile for Next.js 16 on Railway
# Optimized for small image size and fast builds

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies based on the package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Build the Next.js app (generates .next/standalone)
RUN npm run build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Don't run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create directory for persistent data
RUN mkdir -p .data && chown -R nextjs:nodejs .data

# Copy standalone output from builder
# Next.js standalone includes minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port (Railway will set PORT env var dynamically)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/offers', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the Next.js server
# Railway will inject PORT env var; Next.js will listen on it automatically
CMD ["node", "server.js"]
