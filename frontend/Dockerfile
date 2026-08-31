# Stage 1: Build static assets with Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies required for building
RUN npm ci

# Copy frontend source code
COPY . .

# Accept build-time API URL argument and set as environment variable for Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle into /app/dist
RUN npm run build

# Stage 2: Serve static files with NGINX
FROM nginx:alpine

# Remove default NGINX website configuration
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Run NGINX in foreground
CMD ["nginx", "-g", "daemon off;"]
