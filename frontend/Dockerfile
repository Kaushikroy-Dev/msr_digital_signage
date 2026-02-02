FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (including serve for production)
RUN npm install

# Copy rest of the app
COPY . .

# Pass build-time environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build


# Install serve globally to ensure it's available
RUN npm install -g serve

# Expose port (not strictly required by Railway but good practice)
EXPOSE 3000

# Use shell form to ensure $PORT expansion
CMD serve -s dist -l $PORT
