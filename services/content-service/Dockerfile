FROM node:18-alpine

WORKDIR /app

# Install build dependencies for sharp if needed (though 0.33+ usually brings prebuilts)
RUN apk add --no-cache libc6-compat

# Copy only package files first
COPY package*.json ./

# Install dependencies
# We explicitly install the musl version of sharp to avoid the runtime error
RUN npm install && \
    npm install @img/sharp-linux-x64 @img/sharp-linuxmusl-x64

# Copy rest of the app
COPY . .

EXPOSE 3002

CMD ["npm", "start"]

