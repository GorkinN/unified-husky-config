#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// \hooks\pre-commit.js
const configLoader = require("./scripts/utils/config-loader");
const logger = require("./scripts/utils/logger");

async function runPreCommitChecks() {
  const config = configLoader.getConfig();

  // Проверяем, включена ли проверка
  if (!config.preCommit?.enabled) {
    logger.info("⏭️ Pre-commit проверки отключены");
    return true;
  }

  // Пропускаем проверку по паттерну
  const currentBranch = require("child_process")
    .execSync("git branch --show-current", { encoding: "utf8" })
    .trim();

  const commitMsg = require("child_process")
    .execSync("git log -1 --pretty=%B", { encoding: "utf8" })
    .trim();

  if (
    config.preCommit.skipPattern &&
    config.preCommit.skipPattern.test(commitMsg)
  ) {
    logger.info(`⏭️ Пропуск проверки по паттерну: ${commitMsg}`);
    return true;
  }

  logger.info("🚀 Запуск pre-commit проверок...\n");

  const results = [];
  const checks = config.preCommit.checks.filter((check) => check.enabled);

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
        logger.error("💥 Критическая проверка не пройдена, коммит отменен");
        return false;
      }
    }
  }

  // Вывод итогов
  logger.info("📊 Результаты pre-commit проверок:");
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

  logger.success("\n🎉 Все pre-commit проверки пройдены!");
  return true;
}

// Таймаут
async function runWithTimeout() {
  const config = configLoader.getConfig();
  const timeout = config.preCommit?.timeout || 10000;

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Превышен таймаут ${timeout}ms`)),
      timeout
    );
  });

  try {
    await Promise.race([runPreCommitChecks(), timeoutPromise]);
  } catch (error) {
    logger.error(`\n❌ Pre-commit проверка не пройдена: ${error.message}`);
    process.exit(1);
  }
}

runWithTimeout().then((success) => {
  process.exit(success ? 0 : 1);
});
