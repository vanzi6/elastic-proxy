// define the custom settings for each transport (file, console)
const options = {
    combined: {
        filename: process.env.LOG_COMBINED_FILENAME,
        maxsize: process.env.LOGS_FILE_MAX_SIZE_BYTES,
        maxFiles: process.env.LOGS_MAX_NUMBER_OF_FILES,
    },
    exceptions: {
        filename: process.env.LOG_EXCEPTION_FILENAME,
        maxsize: process.env.LOGS_FILE_MAX_SIZE_BYTES,
        maxFiles: process.env.LOGS_MAX_NUMBER_OF_FILES,
    },
    silent: (process.env.LOGS_DISABLED === 'false' ? false : true),
};

module.exports = options;