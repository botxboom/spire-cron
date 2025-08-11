const fs = require("fs");
const path = require("path");

const LAST_RUN_FILE = path.join(__dirname, "lastRun.json");

function getLastRun(objectType) {
  try {
    const data = fs.readFileSync(LAST_RUN_FILE, "utf-8");
    const parsed = JSON.parse(data);
    console.log(parsed[objectType]);
    return parsed[objectType] || "2025-07-08T14:17:40.063960";
  } catch (e) {
    return "2025-07-08T14:17:40.063960";
  }
}

function setLastRun(objectType, dateString) {
  let parsed = {};
  try {
    parsed = JSON.parse(fs.readFileSync(LAST_RUN_FILE, "utf-8"));
  } catch (e) {}
  parsed[objectType] = dateString;
  fs.writeFileSync(LAST_RUN_FILE, JSON.stringify(parsed, null, 2), "utf-8");
}

module.exports = { getLastRun, setLastRun };

// CLI support: node lastRunStore.js customers 2025-07-01
if (require.main === module) {
  const [, , objectType, date] = process.argv;
  if (!objectType || !date) {
    console.log("Usage: node lastRunStore.js <objectType> <YYYY-MM-DD>");
    process.exit(1);
  }
  // Convert to ISO string if only date is provided
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date}T00:00:00.000Z`
    : date;
  setLastRun(objectType, isoDate);
  console.log(`Set last run for ${objectType} to ${isoDate}`);
}
