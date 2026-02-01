FROM node:18

# Install dependencies for sharp
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove any existing node_modules to ensure clean install
RUN rm -rf node_modules package-lock.json || true

# Set npm config to install optional dependencies
RUN npm config set optional true

# Install dependencies
RUN npm install

# Remove sharp completely and reinstall for correct platform
RUN npm uninstall sharp || true

# Install sharp with explicit platform (linux glibc)
RUN npm install sharp --platform=linux --arch=x64

# Verify sharp loads correctly
RUN node -e "const sharp = require('sharp'); console.log('✅ Sharp version:', sharp.versions); console.log('✅ Sharp loaded successfully')"

# Remove dev dependencies
RUN npm prune --production

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
