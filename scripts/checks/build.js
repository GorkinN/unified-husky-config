// scripts\checks\build.js
const { execSync } = require("child_process");
const logger = require("../utils/logger");
const configLoader = require("../utils/config-loader");

module.exports = async function buildCheck() {
  const config = configLoader.getConfig();
  const projectType = config.general.projectType;

  logger.info(`🏗️  Проверка сборки (${projectType})...`);

  try {
    const buildCommand =
      projectType === "nextjs" ? "npx next build --no-lint" : "npx vite build";

    execSync(buildCommand, { stdio: "inherit" });
    logger.success("✅ Сборка успешна");
    return true;
  } catch (error) {
    logger.error(`❌ Ошибка сборки ${projectType}`);
    throw error;
  }
};
