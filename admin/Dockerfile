# Production-ready Dockerfile for admin app using multi-stage builds

# Stage 1: Build frontend (csv-import-react package)
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy frontend source files
COPY frontend/package.json ./
COPY frontend/yarn.lock ./
RUN yarn install --ignore-engines
COPY frontend/ ./

# Build the frontend package
RUN yarn build:react:prod

# Stage 2: Dependencies for admin app
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files
COPY admin/package.json ./
COPY admin/package-lock.json ./

# Install all dependencies (including dev dependencies) for build
RUN npm ci --legacy-peer-deps

# Stage 3: Builder for admin app
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy admin source files
COPY admin/ ./

# Create directory for csv-import-react
RUN mkdir -p ./node_modules/csv-import-react/build

# Copy the built frontend package
COPY --from=frontend-builder /app/build/ ./node_modules/csv-import-react/build/
COPY --from=frontend-builder /app/package.json ./node_modules/csv-import-react/

# Build the admin app
RUN npm run build

# Stage 4: Production runner
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Copy built files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

# Copy all node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Create a non-root user and set permissions
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app/.next
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables should be passed at runtime
# For example: docker run -p 3000:3000 --env-file .env.production admin-app


# Environment variables
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Start the production server
CMD ["npm", "start"]