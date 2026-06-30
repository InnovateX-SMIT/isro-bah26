FROM node:24-slim

WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Set environment to production and disable Next.js telemetry
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Accept build-time API URL argument
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js project
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
