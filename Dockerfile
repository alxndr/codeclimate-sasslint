FROM node:6.3.1

WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install

RUN useradd -m -u 9000 app

COPY . /usr/src/app
RUN chown -R app:app /usr/src/app

USER app

WORKDIR /code

CMD ["node", "index.js"]
