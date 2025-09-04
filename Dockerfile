# Multi-stage build for Railway deployment
FROM node:18-alpine AS frontend-build
WORKDIR /app

# Debug: List what's in the build context
RUN ls -la
RUN ls -la frontend/ || echo "frontend directory not found"

# Try copying everything first to see what's available
COPY . ./
RUN ls -la
RUN ls -la frontend/ || echo "frontend directory not found after COPY ."
RUN cat frontend/package.json || echo "package.json not found in frontend/"

# If frontend directory exists, work from there
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm install
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Copy built applications
COPY --from=frontend-build /app/frontend/build ./frontend/build
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package*.json ./backend/

# Copy root files
COPY package*.json ./

# Install root dependencies
RUN npm ci --only=production

# Create upload directory
RUN mkdir -p /app/uploads

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "run", "start:production"]
