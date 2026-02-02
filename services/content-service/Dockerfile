FROM node:18-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - postinstall script will ensure sharp binary is downloaded
RUN npm install

# Copy application code
COPY . .

EXPOSE 3002

CMD ["npm", "start"]
