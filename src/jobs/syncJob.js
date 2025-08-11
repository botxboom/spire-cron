const cron = require("node-cron");
const SpireHubSpotAPI = require("../api/spireHubspotApi");
const logger = require("../utils/logger");

const syncData = async () => {
  try {
    const api = new SpireHubSpotAPI();

    await api.getCustomersByCompany("Bethel", 1000);
    await api.getContactsByCompany("Bethel", 1000);
    await api.getProductsByCompany("Bethel", 1000);
    await api.getDealsByCompany("Bethel", 1000);

    logger.info(
      "Data fetched from Spire successfully. Starting to post to HubSpot..."
    );

    await api.postCompaniesToHubspot().catch((error) => {
      logger.error("Error posting companies to HubSpot:", error);
    });
    await api.postContactsToHubspot().catch((error) => {
      logger.error("Error posting contacts to HubSpot:", error);
    });
    await api.postProductsToHubspot().catch((error) => {
      logger.error("Error posting products to HubSpot:", error);
    });
    await api.postDealsToHubspot().catch((error) => {
      logger.error("Error posting deals to HubSpot:", error);
    });

    logger.info("Data synchronization completed successfully.");
  } catch (error) {
    logger.error("Error during data synchronization:", error);
  }
};

function startSyncJob() {
  // Runs at 00:00, 06:00, 12:00, and 18:00 every day
  cron.schedule("0 0,6,12,18 * * *", syncData);
  logger.info(
    "Sync job scheduled to run 4 times a day (00:00, 06:00, 12:00, 18:00)."
  );
}

module.exports = { startSyncJob };
