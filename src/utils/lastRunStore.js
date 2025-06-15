const fs = require("fs");
const path = require("path");

const LAST_RUN_FILE = path.join(__dirname, "lastRun.json");

function getLastRun(objectType) {
  try {
    const data = fs.readFileSync(LAST_RUN_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return parsed[objectType] || "1970-01-01T00:00:00.000Z";
  } catch (e) {
    return "1970-01-01T00:00:00.000Z";
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
