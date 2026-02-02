FROM node:18-bullseye

WORKDIR /app

# Configure npm to always install optional dependencies
# This is critical for sharp's native binary
RUN npm config set optional true

# Copy package files
COPY package*.json ./

# Install dependencies - force optional deps even in production
RUN npm install --include=optional

# Verify sharp binary exists
RUN test -f node_modules/sharp/lib/sharp-linux-x64.node || \
    (echo "Sharp binary missing, attempting rebuild..." && \
     npm rebuild sharp --include=optional || \
     npm install sharp@^0.33.1 --save --include=optional)

# Copy application code
COPY . .

EXPOSE 3002

CMD ["npm", "start"]
