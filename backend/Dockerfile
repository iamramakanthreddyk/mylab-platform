# Use official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the backend code
COPY . .

# Build TypeScript (if needed)
RUN npm run build

# Expose the port (Railway will set process.env.PORT)
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
