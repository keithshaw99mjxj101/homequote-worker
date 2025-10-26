# Use Microsoft Playwright base image for reliable headless Chromium
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .

EXPOSE 3000
CMD ["npm","start"]
