FROM node:lts-alpine

WORKDIR /app
COPY . /app

RUN npm i
RUN npm run build:force

# API (to be deployed)
ENV PORT 8000

# UI
#EXPOSE 5173
EXPOSE 8080

CMD [ "npm", "run", "preview" ]
