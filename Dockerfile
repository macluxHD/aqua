FROM node:16-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY ["package.json", "package-lock.json*", "./"]

# Install ffmpeg
RUN apk update
RUN apk add
RUN apk add ffmpeg
RUN apk add alpine-sdk
RUN apk add libtool
RUN apk add libsodium
RUN apk add autoconf
RUN apk add automake
RUN apk add python3

RUN npm install --location=global npm
RUN npm install

# Bundle app source
COPY . .

CMD [ "npm", "run" , "startup" ]