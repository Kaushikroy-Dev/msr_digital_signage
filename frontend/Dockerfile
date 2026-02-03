FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (including serve for production)
RUN npm install

# Copy rest of the app
COPY . .

# Build the application during image build (not at runtime)
RUN npm run build

# Expose port
EXPOSE 3000

# Serve the built application
CMD serve -s dist -l $PORT

