// Config
const configLogger = require('./config/logger');

// Imports
const { createLogger, transports, format } = require('winston');
const { combine, timestamp, label, printf } = format;

// Format log input
const myFormat = printf(info => {
    return info.timestamp + (info.ip ? ' | ' + info.ip : '') + ' | ' + info.level + ': ' + info.message + ' ' + (info.status ? info.status : '');
});

// Instantiate a new Winston Logger with the settings from config
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