FROM node:6.3.1

# Code Climate creates this directory, but let's be extra sure
RUN mkdir -p /code

WORKDIR /code
ADD . /code

RUN npm install

CMD ["node", "index.js"]
