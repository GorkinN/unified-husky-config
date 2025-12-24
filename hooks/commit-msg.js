#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @file commit-msg.js
 * @version 1.0.0
 * @description Husky hook для валидации сообщений коммитов
 * @module commit-msg-hook
 *
 * @overview
 * Проверяет соответствие сообщений коммитов стандарту Conventional Commits.
 * Поддерживает кастомные настройки из конфигурации.
 *
 * @example
 * // Используется автоматически при коммите:
 * git commit -m "feat: add new feature"
 *
 * @requires fs
 * @requires path
 * @requires ./scripts/utils/config-loader
 * @requires ./scripts/utils/logger
 */

const fs = require("fs");
const path = require("path");
const configLoader = require("./scripts/utils/config-loader");
const logger = require("./scripts/utils/logger");

/**
 * Преобразует строку с паттерном в RegExp
 * @param {string|RegExp} pattern - Паттерн из конфига
 * @returns {RegExp} Регулярное выражение
 */
function parsePattern(pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  if (typeof pattern === "string") {
    // Убираем флаги из строки если есть
    const match = pattern.match(/^\/(.*?)\/([gimuy]*)$/);
    if (match) {
      return new RegExp(match[1], match[2] || "i");
    }

    // Если строка без слешей, добавляем их
    return new RegExp(pattern, "i");
  }

  // Дефолтный паттерн
  return /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert)(\(.+\))?: .+/i;
}

/**
 * Проверяет, является ли коммит специальным (merge/revert/squash)
 * @param {string} commitMessage - Сообщение коммита
 * @param {Object} config - Конфигурация хука
 * @returns {boolean}
 */
function isSpecialCommit(commitMessage, config) {
  const message = commitMessage.trim();

  // Проверяем autoSkipPattern если есть
  if (config.autoSkipPattern) {
    const skipPattern = parsePattern(config.autoSkipPattern);
    if (skipPattern.test(message)) {
      return true;
    }
  }

  // Проверяем специальные типы коммитов
  if (message.startsWith("Merge ") && config.allowMerge !== false) {
    return true;
  }

  if (message.startsWith("Revert ") && config.allowRevert !== false) {
    return true;
  }

  if (message.includes("squash") && config.allowSquash !== false) {
    return true;
  }

  return false;
}

/**
 * Извлекает информацию из сообщения коммита
 * @param {string} commitMessage - Сообщение коммита
 * @param {RegExp} pattern - Паттерн для парсинга
 * @returns {Object|null}
 */
function parseCommitMessage(commitMessage, pattern) {
  const match = commitMessage.match(pattern);
  if (!match) {
    return null;
  }

  const [, type, scopePart] = match;
  const scope = scopePart ? scopePart.replace(/[()]/g, "") : null;
  const description = commitMessage.replace(match[0], "").trim();

  return { type, scope, description, raw: commitMessage };
}

/**
 * Проверяет scope на соответствие разрешенным
 * @param {string} scope - Scope из коммита
 * @param {string[]} allowedScopes - Разрешенные scopes из конфига
 * @returns {boolean}
 */
function validateScope(scope, allowedScopes) {
  if (!allowedScopes || allowedScopes.length === 0) {
    return true; // Не проверяем если список пустой
  }

  if (!scope) {
    return false; // Scope обязателен если есть allowedScopes
  }

  return allowedScopes.includes(scope);
}

/**
 * Проверяет type на соответствие разрешенным
 * @param {string} type - Type из коммита
 * @param {string[]} allowedTypes - Разрешенные types из конфига
 * @returns {boolean}
 */
function validateType(type, allowedTypes) {
  if (!allowedTypes || allowedTypes.length === 0) {
    return true; // Не проверяем если список пустой
  }

  return allowedTypes.includes(type);
}

/**
 * Основная функция валидации сообщения коммита
 * @async
 * @returns {Promise<boolean>} true если валидно, false если нет
 */
async function validateCommitMessage() {
  const config = configLoader.getConfig();

  // Отладочное логирование
  if (config.general?.verbose) {
    logger.debug(
      `🔍 Конфиг commitMsg: ${JSON.stringify(config.commitMsg, null, 2)}`
    );
  }

  // Проверяем, включена ли проверка
  if (!config.commitMsg?.enabled) {
    logger.info("⏭️ Проверка сообщения коммита отключена");
    return true;
  }

  // Пропускаем проверку в CI если настроено
  if (config.general?.skipCI && process.env.CI === "true") {
    logger.info("⏭️ Проверка пропущена (CI environment)");
    return true;
  }

  const commitMsgFile = process.argv[2];
  if (!commitMsgFile) {
    logger.error("❌ Ошибка: не передан файл с сообщением коммита");
    logger.info("💡 Убедитесь, что хук настроен правильно в .husky/commit-msg");
    return false;
  }

  try {
    const rawCommitMsg = fs.readFileSync(commitMsgFile, "utf8");
    const commitMsg = rawCommitMsg
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n")
      .trim();

    if (config.general?.verbose) {
      logger.debug(`📝 Сообщение для проверки: "${commitMsg}"`);
    }

    // Проверка на пустое сообщение
    if (!commitMsg) {
      logger.error("❌ Сообщение коммита пустое");
      return false;
    }

    // Проверяем специальные коммиты (merge, revert, squash)
    if (isSpecialCommit(commitMsg, config.commitMsg)) {
      logger.info(
        "✅ Специальный коммит (merge/revert/squash) - пропускаем проверку"
      );
      return true;
    }

    // Проверка длины
    const minLength = config.commitMsg.minLength || 0;
    const maxLength = config.commitMsg.maxLength || Infinity;

    if (commitMsg.length < minLength) {
      logger.error(
        `❌ Сообщение слишком короткое: ${commitMsg.length} символов (минимум ${minLength})`
      );
      logger.error(`📝 Сообщение: "${commitMsg}"`);
      return false;
    }

    if (commitMsg.length > maxLength) {
      logger.error(
        `❌ Сообщение слишком длинное: ${commitMsg.length} символов (максимум ${maxLength})`
      );
      logger.error(`📝 Сообщение: "${commitMsg}"`);
      return false;
    }

    // Парсим паттерн
    const pattern = parsePattern(config.commitMsg.pattern);

    // Проверка формата
    const parsed = parseCommitMessage(commitMsg, pattern);
    if (!parsed) {
      logger.error("❌ Неверный формат коммита!");

      // Показываем примеры из конфига если есть
      const examples = config.commitMsg.examples || [
        "feat(button): добавить новую вариацию",
        "fix(modal): исправить закрытие по клику",
        "docs: обновить документацию API",
        "chore(deps): обновить зависимости",
      ];

      console.log("\n📋 Примеры правильных коммитов:");
      examples.forEach((example) => {
        console.log(`  ${example}`);
      });

      console.log("\n💡 Формат: <тип>(<область>): <описание>");

      // Показываем допустимые типы если есть
      const allowedTypes = config.commitMsg.types;
      if (allowedTypes && allowedTypes.length > 0) {
        console.log(`\n🎯 Допустимые типы: ${allowedTypes.join(", ")}`);
      }

      // Показываем допустимые области если есть
      const allowedScopes = config.commitMsg.scopes;
      if (allowedScopes && allowedScopes.length > 0) {
        console.log(`🎯 Допустимые области: ${allowedScopes.join(", ")}`);
      }

      console.log(`\n📝 Ваше сообщение: "${commitMsg}"`);
      return false;
    }

    // Проверяем тип коммита
    if (!validateType(parsed.type, config.commitMsg.types)) {
      logger.error(`❌ Неверный тип коммита: "${parsed.type}"`);
      logger.error(
        `🎯 Допустимые типы: ${config.commitMsg.types?.join(", ") || "любые"}`
      );
      return false;
    }

    // Проверяем область если нужно
    if (config.commitMsg.requireScope && !parsed.scope) {
      logger.error("❌ Обязательна область изменений (scope)");
      logger.error(`🎯 Пример: feat(auth): добавить логин`);
      return false;
    }

    // Проверяем разрешенные области если заданы
    if (!validateScope(parsed.scope, config.commitMsg.scopes)) {
      logger.error(
        `❌ Область изменений не в списке разрешенных: "${parsed.scope}"`
      );
      logger.error(
        `🎯 Допустимые области: ${
          config.commitMsg.scopes?.join(", ") || "любые"
        }`
      );
      return false;
    }

    // Проверяем эмодзи если запрещены
    if (
      config.commitMsg.allowEmoji === false &&
      /[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]/.test(
        commitMsg
      )
    ) {
      logger.error("❌ Эмодзи не разрешены в сообщениях коммитов");
      return false;
    }

    logger.success(
      `✅ Сообщение коммита корректно: ${parsed.type}${
        parsed.scope ? `(${parsed.scope})` : ""
      }: ${parsed.description}`
    );
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.error(`❌ Файл с сообщением коммита не найден: ${commitMsgFile}`);
    } else if (error.code === "EACCES") {
      logger.error(`❌ Нет доступа к файлу: ${commitMsgFile}`);
    } else {
      logger.error(`❌ Ошибка при проверке сообщения: ${error.message}`);
    }

    if (config.general?.verbose) {
      logger.error(`🔍 Stack trace: ${error.stack}`);
    }

    return false;
  }
}

// Запуск с обработкой необработанных исключений
process.on("unhandledRejection", (error) => {
  logger.error(`❌ Необработанное исключение: ${error.message}`);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Запуск
validateCommitMessage()
  .then((isValid) => {
    process.exit(isValid ? 0 : 1);
  })
  .catch((error) => {
    logger.error(`❌ Непредвиденная ошибка: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
