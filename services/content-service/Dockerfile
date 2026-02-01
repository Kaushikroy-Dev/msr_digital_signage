FROM node:18-slim

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

# Install dependencies (including optional dependencies for sharp)
RUN npm install --include=optional

# Force reinstall sharp for the correct platform
RUN npm uninstall sharp || true && \
    npm install --platform=linux --arch=x64 --libc=glibc sharp

# Verify sharp installation
RUN node -e "require('sharp'); console.log('Sharp loaded successfully')" || \
    (npm rebuild sharp && node -e "require('sharp'); console.log('Sharp rebuilt successfully')")

# Remove dev dependencies to reduce image size
RUN npm prune --production

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
