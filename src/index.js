// File: /spire-hubspot-cron/spire-hubspot-cron/src/index.js

const { startSyncJob } = require("./jobs/syncJob");
const logger = require("./utils/logger");
const https = require("https");
require("dotenv").config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const agent = new https.Agent({
  rejectUnauthorized: false,
});

const init = () => {
  logger.info("Application started. Initializing sync job...");
  startSyncJob();
};

init();
