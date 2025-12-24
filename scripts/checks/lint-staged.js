// scripts\checks\lint-staged.js
const { execSync } = require("child_process");
const logger = require("../utils/logger");

module.exports = async function lintStagedCheck() {
  logger.info("🧹 Запуск lint-staged...");

  try {
    execSync("npx lint-staged", { stdio: "inherit" });
    logger.success("✅ Lint-staged выполнен успешно");
    return true;
  } catch (error) {
    logger.error("❌ Lint-staged завершился с ошибкой");
    throw error;
  }
};
