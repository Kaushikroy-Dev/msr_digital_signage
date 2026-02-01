FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (including serve for production)
RUN npm install

# Copy rest of the app
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway will set PORT env var)
EXPOSE 5173

# Use serve to serve the built static files
# serve automatically listens on 0.0.0.0 and uses PORT env var
CMD ["npm", "start"]
