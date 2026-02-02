FROM node:18-bullseye-slim

# Install system dependencies for sharp and image processing
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - let npm handle the correct sharp binary for this OS
RUN npm install --production

# Copy application code
COPY . .

# Expose content service port
EXPOSE 3002

# Use shell form for port variable expansion
CMD node src/index.js
