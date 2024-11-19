FROM node:lts-alpine

WORKDIR /app
COPY . /app

# API URL to be injected at runtime
ENV VITE_API_URL=PLACEHOLDER_API_URL

ENV VITE_APP_TITLE=MANGO
ENV VITE_APP_PATH=/mango/

RUN npm i
RUN npm run build:force

# API
EXPOSE 8000

# UI
EXPOSE 5174

ENTRYPOINT ["./entrypoint.sh"]

CMD [ "npm", "run", "preview" ]
