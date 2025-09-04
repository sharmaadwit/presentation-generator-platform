# Multi-stage build for Railway deployment
FROM node:18-alpine AS frontend-build
WORKDIR /app

# Copy frontend files
COPY frontend/ ./frontend/

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm ci

# Set environment variables for frontend build
ENV REACT_APP_API_URL=/api
ENV REACT_APP_AI_SERVICE_URL=/ai-service

RUN npm run build

# Verify build was successful
RUN ls -la build/ || echo "Build directory not found"
RUN if [ -f "build/index.html" ]; then echo "Frontend build successful"; else echo "Frontend build failed"; exit 1; fi

# Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm ci --only=production
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
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "run", "start:production"]
