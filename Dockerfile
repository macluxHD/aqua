FROM node:16

# Create app directory
WORKDIR /app

# Install app dependencies
COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

# Bundle app source
COPY . .

CMD [ "npm", "start" ]