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

# Remove sharp from node_modules if it exists (to force reinstall)
RUN rm -rf node_modules/sharp || true

# Install all dependencies first (including dev dependencies for build)
RUN npm install

# Rebuild sharp for the correct platform (linux glibc x64)
RUN npm rebuild sharp --platform=linux --arch=x64 --libc=glibc || \
    npm install --platform=linux --arch=x64 --libc=glibc sharp

# Remove dev dependencies to reduce image size
RUN npm prune --production

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
