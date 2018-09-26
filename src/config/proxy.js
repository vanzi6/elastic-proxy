require('dotenv').config('./.env');
var fs = require('fs');

const config = {
    proxyPort: process.env.PROXY_PORT,
    elasticUrl: process.env.ELASTIC_URL,
    proxyOptions: (process.env.SSL_CERTS_ENABLED === 'true' ? {
        target: process.env.ELASTIC_URL,
        selfHandleResponse: true,
        ignorePath: true,
        ssl: {
            key: fs.readFileSync(process.env.SSL_KEY, process.env.SSL_ENCODING),
            cert: fs.readFileSync(process.env.SSL_CERT, process.env.SSL_ENCODING)
        },
    } : {
        target: process.env.ELASTIC_URL,
        changeOrigin: true,
        selfHandleResponse: true,
        ignorePath: true,
    })
}
module.exports = config;