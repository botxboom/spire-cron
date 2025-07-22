const cron = require("node-cron");
const { getLastRun, setLastRun } = require("../utils/lastRunStore");
const SpireHubSpotAPI = require("../api/spireHubspotApi");
const logger = require("../utils/logger");

const syncData = async () => {
  try {
    const lastRun = getLastRun();
    const now = new Date().toISOString();

    const api = new SpireHubSpotAPI();
    // await api.getCustomersByCompany("Bethel", 100, lastRun);
    // await api.getContactsByCompany("Bethel", 100, lastRun);
    // await api.getProductsByCompany("Bethel", 100, lastRun);
    await api.getDealsByCompany("Bethel", 100, lastRun);
    // const response = await api.getDealByOrderNo("0000826607", "Bethel");
    // const deal = response.records[0];
    // await api.postOrderandItems("", "Bethel");
    setLastRun(now);

    logger.info(
      "Data fetched from Spire successfully. Starting to post to HubSpot..."
    );

    // await api.postCompaniesToHubspot();
    // await api.postContactsToHubspot();
    // await api.postProductsToHubspot();
    await api.postDealsToHubspot();

    logger.info("Data synchronization completed successfully.");
    setLastRun(now);
  } catch (error) {
    logger.error("Error during data synchronization:", error);
  }
};

function startSyncJob() {
  // Schedule the sync job to run every 10 minutes
  syncData();
  // cron.schedule("* * * * *", syncData);
  logger.info("Sync job scheduled to run every 10 minutes.");
}

module.exports = { startSyncJob };
