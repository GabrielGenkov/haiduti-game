# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Copy shared code (needed for @shared/* path alias)
COPY shared/ ./shared/

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copy backend source and build
COPY backend/ ./backend/
RUN cd backend && npm run build

# ── Runtime stage ────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Install production dependencies only
COPY --from=build /app/backend/package*.json ./
RUN npm ci --omit=dev

# Copy compiled output
COPY --from=build /app/backend/dist/ ./dist/

EXPOSE 3000
CMD ["node", "dist/backend/src/main.js"]
