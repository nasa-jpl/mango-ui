FROM node:lts-alpine

WORKDIR /app
COPY . /app

RUN npm i
RUN npm run build:force

# API
EXPOSE 8000

# UI
EXPOSE 5174

CMD [ "npm", "run", "preview" ]
