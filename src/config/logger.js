// define the custom settings for each transport (file, console)
const options = {
    combined: {
        filename: process.env.LOG_COMBINED_FILENAME,
        maxsize: process.env.LOG_FILE_MAX_SIZE_BYTES,
        maxFiles: process.env.LOG_MAX_NUMBER_OF_FILES,
    },
    exceptions: {
        filename: process.env.LOG_EXCEPTION_FILENAME,
        maxsize: process.env.LOG_FILE_MAX_SIZE_BYTES,
        maxFiles: process.env.LOG_MAX_NUMBER_OF_FILES,
    }
};

module.exports = options;