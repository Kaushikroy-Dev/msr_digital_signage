FROM node:18-bullseye

WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install dependencies (Sharp will auto-download correct binary)
RUN npm install

# Copy rest of the app
COPY . .

EXPOSE 3002

CMD ["npm", "start"]
