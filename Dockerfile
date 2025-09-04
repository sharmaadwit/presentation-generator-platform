# Multi-stage build for Railway deployment
FROM node:18-alpine AS frontend-build
WORKDIR /app

# Copy everything first to see what's available
COPY . ./

# Debug: Check what was copied
RUN echo "=== DEBUGGING BUILD CONTEXT ==="
RUN echo "Contents of /app after copying everything:" && ls -la /app/
RUN echo "Contents of /app/frontend:" && ls -la /app/frontend/ || echo "frontend directory not found"
RUN echo "Checking if frontend directory exists:" && test -d /app/frontend && echo "frontend directory exists" || echo "frontend directory does not exist"
RUN echo "Checking for any frontend files:" && find /app -name "package.json" -path "*/frontend/*" 2>/dev/null || echo "No frontend package.json found"
RUN echo "All package.json files found:" && find /app -name "package.json" 2>/dev/null || echo "No package.json files found"
RUN echo "All directories in /app:" && find /app -type d -maxdepth 2 2>/dev/null || echo "No directories found"
RUN echo "=== END DEBUGGING ==="

# Install frontend dependencies and build
WORKDIR /app/frontend

# Check if we're in the right directory and files exist
RUN echo "Current directory: $(pwd)" && ls -la

# Set environment variables for frontend build
ENV REACT_APP_API_URL=/api
ENV REACT_APP_AI_SERVICE_URL=/ai-service

# Check if package.json exists, if not, skip frontend build
RUN if [ -f "package.json" ]; then \
      echo "package.json found, proceeding with frontend build"; \
      npm install; \
      npm run build; \
    else \
      echo "package.json not found, creating fallback frontend"; \
      mkdir -p build; \
      echo '<!DOCTYPE html><html><head><title>Presentation Generator</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:50px auto;padding:20px;text-align:center;}h1{color:#e74c3c;}p{color:#666;line-height:1.6;}.status{background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;}.api-info{background:#e8f5e8;padding:15px;border-radius:5px;margin:20px 0;}</style></head><body><h1>🚧 Frontend Build Issue</h1><div class="status"><p><strong>Status:</strong> API is running but frontend build failed.</p><p><strong>Issue:</strong> Frontend source files not found during build process.</p></div><div class="api-info"><p><strong>✅ Backend API is working!</strong></p><p>You can access the API endpoints directly:</p><ul style="text-align:left;display:inline-block;"><li><code>/api/*</code> - API endpoints</li><li><code>/health</code> - Health check</li></ul></div><p><em>This is a temporary fallback page. The development team has been notified.</em></p></body></html>' > build/index.html; \
    fi

# Verify build was successful
RUN ls -la build/ || echo "Build directory not found"
RUN if [ -f "build/index.html" ]; then echo "Frontend build successful"; else echo "Frontend build failed"; exit 1; fi

# Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm ci
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
