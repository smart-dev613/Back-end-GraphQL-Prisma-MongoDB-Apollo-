# FROM mhart/alpine-node:16.13
FROM node:16-alpine 

############# CHROMIUM (PUPPETEER)

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

###############################

# Setting working directory. All the path will be relative to WORKDIR
WORKDIR /usr/src/app

# Installing dependencies
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install 

# Copying source files
COPY . .
RUN npx prisma generate
# Running the app
CMD [ "yarn", "start" ]