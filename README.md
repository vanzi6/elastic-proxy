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
docker run -tdi --name elastic-proxy -p 8008:8008 vanzi/elastic-proxy
```