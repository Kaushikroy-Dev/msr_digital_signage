FROM node:18-bullseye-slim

# Install system dependencies for sharp and image processing
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure optional dependencies are NOT skipped during build
ENV NODE_ENV=production
ENV npm_config_optional=true
ENV npm_config_include=optional

COPY package*.json ./

# Force install including optional dependencies and rebuild sharp to match the container architecture
RUN npm install --include=optional \
    && npm rebuild sharp --verbose

# Verify sharp can be loaded during the build phase
RUN node -e "require('sharp') && console.log('sharp library loaded successfully during build')"

COPY . .

# Expose content service port
EXPOSE 3002

# Use array form for CMD
CMD ["node", "src/index.js"]
