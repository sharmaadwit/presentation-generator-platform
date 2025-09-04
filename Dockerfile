# Multi-stage build for Railway deployment
FROM node:18-alpine AS base

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Build AI service
FROM python:3.11-slim AS ai-build
WORKDIR /app/ai-service
COPY ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ai-service/ ./

# Production image
FROM node:18-alpine AS production

# Install Python for AI service
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy built applications
COPY --from=frontend-build /app/frontend/build ./frontend/build
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package*.json ./backend/
COPY --from=ai-build /app/ai-service ./ai-service

# Copy root files
COPY package*.json ./
COPY railway.json ./

# Install root dependencies
RUN npm ci --only=production

# Create upload directory
RUN mkdir -p /app/uploads

# Expose ports
EXPOSE 3000 3001 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start all services
CMD ["npm", "run", "start:all"]
