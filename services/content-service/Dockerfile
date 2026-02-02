FROM node:18-bullseye

# Install build dependencies for sharp (needed if building from source)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libvips-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Try to install sharp with binary first, fallback to building from source
RUN npm install --include=optional || \
    (echo "Standard install failed, trying with build-from-source..." && \
     npm install --build-from-source=sharp --include=optional)

# Verify sharp works
RUN node -e "const sharp = require('sharp'); console.log('✅ Sharp loaded successfully:', sharp.versions);" || \
    (echo "❌ Sharp verification failed, attempting rebuild from source..." && \
     npm rebuild sharp --build-from-source && \
     node -e "const sharp = require('sharp'); console.log('✅ Sharp rebuilt successfully')")

# Copy application code
COPY . .

EXPOSE 3002

CMD ["npm", "start"]
