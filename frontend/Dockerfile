FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install all dependencies (serve is in dependencies, not devDependencies)
RUN npm install

# Copy rest of the app
COPY . .

# Build the application during image build (not at runtime)
RUN npm run build

# Expose port
EXPOSE 3000

# Serve the built application using npx to ensure serve is found in node_modules/.bin
CMD npx serve -s dist -l $PORT

