FROM node:18-slim

# Install dependencies for sharp
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Install dependencies and rebuild sharp for the correct platform
RUN npm install --production && \
    npm rebuild sharp

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
