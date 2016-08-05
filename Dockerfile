FROM node:6.3.1

RUN mkdir -p /app

WORKDIR /app
ADD . /app

RUN npm install

CMD ["node", "index.js"]
