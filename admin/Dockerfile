# Production-ready Dockerfile for admin app

# Stage 1: Build frontend (csv-import-react package)
FROM node:18 AS frontend-builder
WORKDIR /app

# Copy frontend source files
COPY frontend/package.json ./
COPY frontend/yarn.lock ./
RUN yarn install --ignore-engines
COPY frontend/ ./

# Build the frontend package
RUN yarn build:react:prod

# Stage 2: Admin app build
FROM node:18 AS builder
WORKDIR /app

# Set environment variables for build time
ENV NEXT_PUBLIC_BACKEND_URL=https://api.importcsv.com

# Copy package files and install dependencies
COPY admin/package.json ./
COPY admin/package-lock.json ./
RUN npm ci --legacy-peer-deps

# Remove the @importcsv/react package if it exists
RUN rm -rf ./node_modules/@importcsv/react

# Create the directory structure for the @importcsv/react package
RUN mkdir -p ./node_modules/@importcsv/react/build

# Copy the built frontend package
COPY --from=frontend-builder /app/build/ ./node_modules/@importcsv/react/build/
COPY --from=frontend-builder /app/package.json ./node_modules/@importcsv/react/

# Copy admin source files (after handling node_modules)
COPY admin/ ./

# Build the admin app
RUN npm run build

# Stage 4: Production runner
FROM node:18 AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Copy built files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
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

# Environment variables
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
# Runtime environment variables
ENV NEXT_PUBLIC_BACKEND_URL=https://api.importcsv.com
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Start the production server
CMD ["npm", "start"]