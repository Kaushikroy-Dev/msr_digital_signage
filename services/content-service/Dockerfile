FROM node:18-bullseye

# Install system dependencies for sharp
RUN apt-get update && apt-get install -y \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - sharp will auto-download binary for linux-x64
RUN npm install --include=optional

# Copy application code
COPY . .

EXPOSE 3002

CMD ["npm", "start"]
