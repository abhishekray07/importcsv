# Multi-stage build for admin app with frontend integration

# Stage 1: Build the frontend
FROM node:18 AS frontend-builder
WORKDIR /frontend

# Copy frontend source files
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./

# Build the frontend (using the React build script)
RUN npm run build:react

# Stage 2: Build the admin app
FROM node:18
WORKDIR /app

# Copy package.json and install dependencies
COPY admin/package.json admin/package-lock.json ./
RUN npm install --legacy-peer-deps

# Remove the csv-import-react package if it exists
RUN rm -rf ./node_modules/csv-import-react

# Create the directory structure for the csv-import-react package
RUN mkdir -p ./node_modules/csv-import-react/build

# Copy the built frontend from the first stage
COPY --from=frontend-builder /frontend/package.json ./node_modules/csv-import-react/
COPY --from=frontend-builder /frontend/build/ ./node_modules/csv-import-react/build/

# Copy admin source files (after handling node_modules)
COPY admin/ ./

# Expose port
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]