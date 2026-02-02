FROM node:18-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (don't skip optional)
RUN npm ci --include=optional || npm install --include=optional

# Copy application code
COPY . .

EXPOSE 3002

CMD ["node", "src/index.js"]
