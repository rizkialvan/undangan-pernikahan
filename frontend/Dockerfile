# Stage 1: Build the application using Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (use npm install since no package-lock.json exists)
RUN npm install

# Copy source files
COPY . .

# Build the application (creates dist/ folder)
RUN npm run build

# Run build:public to create the public/ folder with all assets
RUN npm run build:public

# Stage 2: Serve with nginx
FROM nginx:alpine AS production

# Install gettext for envsubst (for runtime config)
RUN apk add --no-cache gettext

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/public /usr/share/nginx/html

# Override USER from base image (nginx:alpine sets USER nginx)
# Run as root to avoid permission issues with nginx pid and cache directories
USER root

# Expose port 3000 (nginx will listen on this port)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]