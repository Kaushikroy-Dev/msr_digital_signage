FROM node:18-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies including optional (sharp needs this)
RUN npm install --include=optional

# Copy application code
COPY . .

EXPOSE 3002

CMD ["npm", "start"]
