FROM node:18

# Install dependencies for building sharp from source
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    pkg-config \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove any existing node_modules
RUN rm -rf node_modules package-lock.json || true

# Set environment to build sharp from source
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV npm_config_sharp_binary_host=""
ENV npm_config_sharp_libvips_binary_host=""

# Install dependencies
RUN npm install

# Remove sharp and rebuild from source
RUN npm uninstall sharp || true

# Install sharp and force build from source
RUN npm install sharp --build-from-source

# Verify sharp loads
RUN node -e "const sharp = require('sharp'); console.log('✅ Sharp loaded:', sharp.versions);"

# Remove dev dependencies
RUN npm prune --production

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
