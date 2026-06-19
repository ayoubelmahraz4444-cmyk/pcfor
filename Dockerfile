FROM node:18-alpine

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci --only=production

# copy app
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
