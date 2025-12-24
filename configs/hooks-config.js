/**
 * Главный конфигурационный файл Husky
 * @module hooks-config
 * @version 1.0.0
 * @description Объединяет общую и специфичную конфигурацию проектов
 *
 * @param {string} [projectType="common"] - Тип проекта
 * @param {Object} [userConfig={}] - Пользовательские настройки
 * @returns {Object} Полная конфигурация Husky
 *
 * @example
 * // Базовое использование
 * const config = require('./hooks-config.js')('nextjs');
 *
 * // С пользовательскими настройками
 * const config = require('./hooks-config.js')('nextjs', {
 *   preCommit: { enabled: false }
 * });
 */
const path = require("path");

/**
 * Глубокое слияние объектов с поддержкой массивов
 * @param {Object} target - Целевой объект
 * @param {Object} source - Источник для слияния
 * @returns {Object} Результат слияния
 */
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
        // Для массивов - объединяем, убирая дубликаты
        output[key] = mergeArrays(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

/**
 * Объединение массивов с уникальными элементами
 * @param {Array} arr1 - Первый массив
 * @param {Array} arr2 - Второй массив
 * @returns {Array} Объединенный массив
 */
function mergeArrays(arr1, arr2) {
  const combined = [...arr1, ...arr2];
  const unique = new Map();

  // Для объектов проверяем уникальность по имени (если есть)
  combined.forEach((item) => {
    if (item && typeof item === "object" && item.name) {
      unique.set(item.name, item);
    } else {
      unique.set(JSON.stringify(item), item);
    }
  });

  return Array.from(unique.values());
}

/**
 * Проверяет, является ли значение объектом
 * @param {any} item - Проверяемое значение
 * @returns {boolean}
 */
function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Загружает конфигурацию для указанного типа проекта
 * @param {string} projectType - Тип проекта
 * @returns {Object} Конфигурация проекта
 */
function loadProjectConfig(projectType) {
  if (projectType === "common") {
    return {};
  }

  try {
    const configPath = path.join(__dirname, `${projectType}.config.js`);

    // Проверяем существование файла перед require
    if (require("fs").existsSync(configPath)) {
      const config = require(configPath);

      // Если конфиг - функция, вызываем её
      if (typeof config === "function") {
        return config();
      }

      return config;
    }
  } catch (error) {
    console.warn(
      `⚠️  No specific config for ${projectType}, using common: ${error.message}`
    );
  }

  return {};
}

/**
 * Определяет окружение выполнения
 * @returns {string} Окружение
 */
function getEnvironment() {
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    return "ci";
  }
  if (process.env.NODE_ENV === "production") {
    return "production";
  }
  if (process.env.NODE_ENV === "test") {
    return "test";
  }
  return "development";
}

module.exports = function getConfig(projectType = "common", userConfig = {}) {
  // Загружаем общую конфигурацию

  const commonConfig = require("./common.config");
  // Определяем окружение
  const environment = getEnvironment();

  // Загружаем конфигурацию проекта
  const projectConfig = loadProjectConfig(projectType);

  // Получаем настройки для окружения
  const envConfig = commonConfig.environments?.[environment] || {};

  // 1. Сначала объединяем базовый конфиг с конфигом окружения
  let mergedConfig = deepMerge(commonConfig, envConfig);

  // 2. Удаляем environments, так как они уже применены
  delete mergedConfig.environments;

  // 3. Объединяем с конфигом проекта
  mergedConfig = deepMerge(mergedConfig, projectConfig);

  // 4. Объединяем с пользовательским конфигом (самый высокий приоритет)
  mergedConfig = deepMerge(mergedConfig, userConfig);

  // Формируем финальную структуру
  return {
    // Общая информация
    meta: {
      projectType,
      environment,
      configVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
    },

    // Общие настройки
    general: {
      ...mergedConfig.general,
      projectRoot: process.cwd(),
      projectType,
      environment,
    },

    // Конфигурация pre-commit хука
    preCommit: {
      ...mergedConfig.preCommitDefaults,
      ...mergedConfig.preCommit,
      checks: [
        ...(mergedConfig.preCommitDefaults?.checks || []),
        ...(mergedConfig.preCommit?.checks || []),
      ].filter(
        (check, index, self) =>
          // Убираем дубликаты по имени
          index === self.findIndex((c) => c.name === check.name)
      ),
    },

    // Конфигурация pre-push хука
    prePush: {
      ...mergedConfig.prePushDefaults,
      ...mergedConfig.prePush,
      checks: [
        ...(mergedConfig.prePushDefaults?.checks || []),
        ...(mergedConfig.prePush?.checks || []),
      ].filter(
        (check, index, self) =>
          index === self.findIndex((c) => c.name === check.name)
      ),
    },

    // Конфигурация commit-msg хука
    commitMsg: {
      ...mergedConfig.commitMsgDefaults,
      ...mergedConfig.commitMsg,
    },

    // Расширенные настройки
    advanced: {
      // Конфигурация проекта (если есть)
      project: projectConfig,

      // Переменные окружения
      env: {
        nodeEnv: process.env.NODE_ENV,
        isCI: process.env.CI === "true",
        isVerbose: process.env.HUSKY_VERBOSE === "true",
      },

      // Настройки кэширования
      cache: {
        enabled: mergedConfig.general?.cacheEnabled !== false,
        directory: path.join(process.cwd(), ".husky-cache"),
        ttl: 3600000, // 1 час
      },
    },
  };
};

// Дополнительные экспорты для удобства
module.exports.utils = {
  deepMerge,
  loadProjectConfig,
  getEnvironment,
  mergeArrays,

  /**
   * Быстрое создание конфига с умолчаниями
   * @param {string} projectType - Тип проекта
   * @returns {Object}
   */
  createQuickConfig: (projectType) => module.exports(projectType),

  /**
   * Проверяет, доступен ли тип конфигурации
   * @param {string} projectType - Тип проекта
   * @returns {boolean}
   */
  hasProjectConfig: (projectType) => {
    try {
      const configPath = path.join(__dirname, `${projectType}.config.js`);
      return require("fs").existsSync(configPath);
    } catch {
      return false;
    }
  },

  /**
   * Возвращает список доступных типов конфигураций
   * @returns {string[]}
   */
  getAvailableConfigs: () => {
    try {
      const fs = require("fs");
      const files = fs.readdirSync(__dirname);
      return files
        .filter((f) => f.endsWith(".config.js") && f !== "common.config.js")
        .map((f) => f.replace(".config.js", ""));
    } catch {
      return [];
    }
  },
};

// Экспорт для TypeScript/автодополнения
module.exports.default = module.exports;
