FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (including serve for production)
RUN npm install

# Copy rest of the app
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway will set PORT env var, usually 3000)
EXPOSE 3000

# Use serve to serve the built static files
# Explicitly use 0.0.0.0 and the PORT environment variable
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]

