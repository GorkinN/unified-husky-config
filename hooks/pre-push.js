#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// \hooks\pre-push.js
const configLoader = require("./scripts/utils/config-loader");
const logger = require("./scripts/utils/logger");

async function runPrePushChecks() {
  const config = configLoader.getConfig();

  // Проверяем, включена ли проверка
  if (!config.prePush?.enabled) {
    logger.info("⏭️ Pre-push проверки отключены");
    return true;
  }

  // Проверяем, нужно ли пропустить для текущей ветки
  const currentBranch = require("child_process")
    .execSync("git branch --show-current", { encoding: "utf8" })
    .trim();

  if (config.prePush.skipBranches?.includes(currentBranch)) {
    logger.info(`⏭️ Пропуск проверки для ветки: ${currentBranch}`);
    return true;
  }

  logger.info("🚫 Запуск pre-push проверок...\n");

  const results = [];
  const checks = config.prePush.checks.filter((check) => check.enabled);

  for (const check of checks) {
    logger.info(`🔍 ${check.name}...`);

    try {
      const checkModule = require(`./scripts/checks/${check.name}.js`);
      await checkModule();

      logger.success(`  ✅ ${check.name} - пройдено\n`);
      results.push({ name: check.name, passed: true });
    } catch (error) {
      logger.error(`  ❌ ${check.name} - ошибка: ${error.message}\n`);
      results.push({
        name: check.name,
        passed: false,
        error,
        critical: check.critical,
      });

      if (check.critical) {
        logger.error("💥 Критическая проверка не пройдена, push отменен");
        return false;
      }
    }
  }

  // Вывод итогов
  logger.info("📊 Результаты pre-push проверок:");
  results.forEach((r) => {
    console.log(
      `  ${r.passed ? "✅" : "❌"} ${r.name} ${r.critical ? "(крит.)" : ""}`
    );
  });

  const allCriticalPassed = results
    .filter((r) => r.critical)
    .every((r) => r.passed);

  if (!allCriticalPassed) {
    return false;
  }

  logger.success("\n🎉 Все pre-push проверки пройдены!");
  return true;
}

// Таймаут
async function runWithTimeout() {
  const config = configLoader.getConfig();
  const timeout = config.prePush?.timeout || 120000;

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Превышен таймаут ${timeout}ms`)),
      timeout
    );
  });

  try {
    await Promise.race([runPrePushChecks(), timeoutPromise]);
  } catch (error) {
    logger.error(`\n❌ Pre-push проверка не пройдена: ${error.message}`);
    process.exit(1);
  }
}

runWithTimeout().then((success) => {
  process.exit(success ? 0 : 1);
});
