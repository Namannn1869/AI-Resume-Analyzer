FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies separately for caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Final stage
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy only the necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend ./frontend

# Use a non-root user for security
USER node

EXPOSE 3000

# Use tini or just node for signal handling (node handles it okay in recent versions)
CMD ["node", "backend/server.js"]
