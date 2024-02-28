FROM node:lts-alpine

WORKDIR /app
COPY . /app

RUN npm i
RUN npm run build:force
# COPY package.json /app
# COPY node_modules /app/node_modules
ENV PORT 8080
CMD [ "npm", "run", "preview" ]
