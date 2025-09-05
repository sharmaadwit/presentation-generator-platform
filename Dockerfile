# Multi-stage build for Railway deployment
FROM node:18-alpine AS frontend-build
WORKDIR /app

# Set environment variables for frontend build
ENV REACT_APP_API_URL=/api
ENV REACT_APP_AI_SERVICE_URL=/ai-service

# Copy frontend package files and install dependencies
COPY frontend/package*.json /app/
RUN npm install

# Copy frontend source code
COPY frontend/ /app/

# Build frontend with optimizations
RUN CI=false npm run build

# Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app

# Copy backend package files and install dependencies
COPY backend/package*.json /app/
RUN npm install

# Copy backend source code
COPY backend/ /app/

# Build backend
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy built applications
COPY --from=frontend-build /app/build ./frontend/build
COPY --from=backend-build /app/dist ./backend/dist
COPY --from=backend-build /app/node_modules ./backend/node_modules
COPY --from=backend-build /app/package*.json ./backend/

# Create upload directory
RUN mkdir -p /app/uploads

# Expose ports
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
WORKDIR /app/backend
CMD ["node", "dist/index.js"]