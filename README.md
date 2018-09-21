# Elastic proxy server

## Setup

```
npm install
cp .env.example .env
edit .env
```

## Node start

```
npm start
```

## Docker

```
docker run -tdi --name elastic-proxy -p 8008:8008 -v "$PWD":/usr/src/app -w /usr/src/app node:8 sh docker-start.sh
```