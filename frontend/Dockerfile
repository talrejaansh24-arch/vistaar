FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Expose port and start
ENV PORT=5173
EXPOSE 5173

CMD ["npm", "run", "start"]
