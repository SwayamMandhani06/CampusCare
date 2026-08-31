# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy dependency manifests first for layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code with ownership assigned to node user
COPY --chown=node:node . .

# Switch to non-root user
USER node

# Expose backend service port
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
