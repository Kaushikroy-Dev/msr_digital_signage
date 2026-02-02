FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (including serve for production)
RUN npm install

# Copy rest of the app
COPY . .

# Expose port
EXPOSE 3000

# RUNTIME BUILD: Force build and serve at the same time to capture Railway Variables
CMD npm run build && serve -s dist -l $PORT

