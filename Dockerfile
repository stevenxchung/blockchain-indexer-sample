FROM node:18

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

# Expose the port for app
EXPOSE 3000
CMD ["npm", "start"]
