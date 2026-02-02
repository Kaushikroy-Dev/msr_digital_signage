FROM node:18-bullseye-slim

# Install system dependencies for sharp and image processing
# libvips-dev is the actual native library sharp binds to
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies) 
# This ensures that build-time requirements for native modules like Sharp are satisfied.
RUN npm install

# Copy application code
COPY . .

# Expose content service port
EXPOSE 3002

# Standard CMD for a Node.js API
CMD ["node", "src/index.js"]
