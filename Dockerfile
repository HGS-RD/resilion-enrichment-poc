# DigitalOcean App Platform Dockerfile
# Alternative deployment method for the Resilion Enrichment Pre-Loader

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files for dependency installation
COPY package*.json ./
COPY turbo.json ./

# Copy workspace configuration
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies
RUN npm ci --only=production

# Install turbo globally for build
RUN npm install -g turbo

# Build the application
RUN npm run build:web

# Change to the web app directory for runtime
WORKDIR /app/apps/web

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
