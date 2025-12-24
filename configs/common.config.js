/**
 * Базовые настройки конфигурации для Husky
 * @module common.config
 * @version 2.0.0
 */

// Базовый объект конфигурации (не функция!)
const config = {
  // Общие настройки
  general: {
    /** Пропускать проверки в CI окружении */
    skipCI: process.env.CI === "true",

    /** Подробный режим логирования */
    verbose: process.env.HUSKY_VERBOSE === "true",

    /** Автоматическое исправление если возможно */
    autoFix: process.env.HUSKY_AUTO_FIX !== "false",

    /** Параллельное выполнение проверок */
    parallelChecks: process.env.HUSKY_PARALLEL !== "false",

    /** Кэширование результатов проверок */
    cacheEnabled: process.env.HUSKY_CACHE !== "false",
  },

  // Настройки pre-commit (используются в hooks-config.js)
  preCommitDefaults: {
    /** Включен ли pre-commit хук */
    enabled: true,

    /** Список проверок для pre-commit */
    checks: [
      {
        name: "lint-staged",
        enabled: true,
        critical: true,
        options: {
          stagedOnly: true,
          allowEmpty: false,
          autoFix: true,
        },
      },
      {
        name: "typescript",
        enabled: true,
        critical: true,
        options: {
          noEmit: true,
          skipLibCheck: true,
          changedOnly: true,
        },
      },
    ],

    /** Таймаут выполнения в миллисекундах */
    timeout: 10000,

    /** Паттерн для пропуска проверки */
    skipPattern: /^wip:|^fixup!|^squash!|^draft:/i,

    /** Запускать ли проверку в CI окружении */
    runInCI: true,

    /** Параллельное выполнение проверок */
    parallel: false,

    /** Останавливаться при первой ошибке */
    failFast: true,
  },

  // Настройки pre-push (используются в hooks-config.js)
  prePushDefaults: {
    /** Включен ли pre-push хук */
    enabled: true,

    /** Список проверок для pre-push */
    checks: [
      {
        name: "build",
        enabled: true,
        critical: true,
        options: {
          production: false,
          sourceMap: true,
        },
      },
      {
        name: "test",
        enabled: false,
        critical: false,
        options: {
          watch: false,
          coverage: false,
        },
      },
    ],

    /** Таймаут выполнения в миллисекундах */
    timeout: 120000,

    /** Ветки для пропуска проверки */
    skipBranches: ["main", "master", "develop", "release/*"],
  },

  // Настройки для commit-msg (используются в hooks-config.js)
  commitMsgDefaults: {
    /** Включена ли проверка сообщений коммитов */
    enabled: true,

    /** Паттерн для проверки формата */
    pattern:
      /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert)(\(.+\))?: .+/,

    /** Минимальная длина сообщения */
    minLength: 10,

    /** Максимальная длина сообщения */
    maxLength: 100,

    /** Разрешать merge коммиты */
    allowMerge: true,

    /** Разрешать revert коммиты */
    allowRevert: true,

    /** Разрешать squash коммиты */
    allowSquash: false,
  },

  // Настройки для переопределения в hooks-config.js (необязательные)
  preCommit: {},
  prePush: {},
  commitMsg: {},

  // Настройки для разных окружений
  environments: {
    /** Настройки для development окружения */
    development: {
      general: {
        verbose: true,
        autoFix: true,
      },
      preCommit: {
        timeout: 15000,
        failFast: false,
      },
      prePush: {
        enabled: false,
      },
    },

    /** Настройки для production окружения */
    production: {
      general: {
        skipCI: false,
        verbose: false,
      },
      preCommit: {
        checks: [
          { name: "lint-staged", enabled: true, critical: true },
          { name: "typescript", enabled: true, critical: true },
        ],
      },
      prePush: {
        enabled: true,
        checks: [
          { name: "build", enabled: true, critical: true },
          { name: "test", enabled: true, critical: false },
        ],
      },
    },

    /** Настройки для CI окружения */
    ci: {
      general: {
        skipCI: false,
        verbose: true,
        parallelChecks: true,
      },
      preCommit: {
        runInCI: true,
        parallel: true,
        timeout: 30000,
      },
      prePush: {
        enabled: true,
        timeout: 180000,
      },
    },
  },
};

// Экспортируем как объект, а не функцию
module.exports = config;

// Дополнительные экспорты для совместимости
module.exports.default = config;
module.exports.utils = {
  /**
   * Определяет текущее окружение
   * @returns {string}
   */
  getEnvironment: () => {
    if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
      return "ci";
    }
    if (process.env.NODE_ENV === "production") {
      return "production";
    }
    return "development";
  },

  /**
   * Проверяет, является ли сообщение коммита WIP/fixup/squash
   * @param {string} commitMessage - Сообщение коммита
   * @param {RegExp} [skipPattern] - Паттерн для пропуска
   * @returns {boolean}
   */
  isSkipCommit: (commitMessage, skipPattern) => {
    const pattern = skipPattern || config.preCommitDefaults.skipPattern;
    return pattern.test(commitMessage.trim());
  },

  /**
   * Проверяет, нужно ли пропустить проверку для текущей ветки
   * @param {string[]} skipBranches - Список веток для пропуска
   * @returns {boolean}
   */
  shouldSkipForBranch: (skipBranches = []) => {
    try {
      const { execSync } = require("child_process");
      const currentBranch = execSync("git branch --show-current", {
        encoding: "utf8",
      }).trim();

      if (!currentBranch || !skipBranches.length) {
        return false;
      }

      return skipBranches.some((pattern) => {
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          return regex.test(currentBranch);
        }
        return currentBranch === pattern;
      });
    } catch {
      return false;
    }
  },
};
