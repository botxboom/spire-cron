const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

const logInfo = (message) => {
  logger.info(message);
};

const logWarning = (message) => {
  logger.warn(message);
};

const logError = (message) => {
  logger.error(message);
};

module.exports = logger;
