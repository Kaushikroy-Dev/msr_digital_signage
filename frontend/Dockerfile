FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build the application
RUN npm run build

# Expose port (Railway will set PORT env var)
EXPOSE 5173

# Use PORT env var if set, otherwise default to 5173
# Vite preview needs to bind to 0.0.0.0 to work on Railway
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT:-5173}"]
