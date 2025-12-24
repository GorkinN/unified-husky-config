// scripts\checks\typescript.js
const { execSync } = require("child_process");
const logger = require("../utils/logger");

module.exports = async function typescriptCheck() {
  logger.info("🔍 Проверка TypeScript...");

  try {
    const result = execSync("npx tsc --noEmit --skipLibCheck", {
      stdio: "pipe",
      encoding: "utf8",
    });

    logger.success("✅ TypeScript проверка пройдена");
    return true;
  } catch (error) {
    logger.error("❌ Ошибки TypeScript:");
    console.log(error.stdout || error.message);
    throw new Error("TypeScript проверка не пройдена");
  }
};
