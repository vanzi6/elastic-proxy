const { createLogger, transports, format } = require('winston');

const configLogger = require('./config/logger');

const { combine, timestamp, label, printf } = format;
 
const myFormat = printf(info => {
    return info.timestamp + (info.ip ? ' | ' + info.ip : '') + ' | ' + info.level + ': ' + info.message + ' ' + (info.status ? info.status : '');
});

// instantiate a new Winston Logger with the settings defined above
var logger = createLogger({
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.File(configLogger.combined)
    ],
    exceptionHandlers: [
        new transports.File(configLogger.exceptions)
    ],
    silent: configLogger.silent,
    exitOnError: false, // do not exit on handled exceptions
});

module.exports = logger;