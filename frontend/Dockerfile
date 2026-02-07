FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install all dependencies (serve is in dependencies, not devDependencies)
RUN npm install

# Copy rest of the app
COPY . .

# Build the application during image build (not at runtime)
# CRITICAL: VITE_API_URL must be set as build arg or env var for Vite to use it
# If not set, Vite will use undefined, which our runtime detection will override
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Expose port
EXPOSE 3000

# Serve the built application using npx to ensure serve is found in node_modules/.bin
# -s flag enables SPA mode (serve index.html for all routes)
# -l flag sets listen port
# Use PORT environment variable (Railway provides this)
# Use shell form to allow variable expansion
CMD ["sh", "-c", "npx serve -s dist -l ${PORT:-3000}"]

