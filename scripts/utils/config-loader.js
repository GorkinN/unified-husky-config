/**
 * @file config-loader.js
 * @version 1.0.0
 * @description Загрузчик конфигурации для Husky хуков
 * @module ConfigLoader
 *
 * @overview
 * Загружает и кэширует конфигурацию Husky из конфигурационных файлов.
 * Определяет тип проекта и предоставляет соответствующий конфиг.
 *
 * @example
 * // Использование в хуках:
 * const configLoader = require('./scripts/utils/config-loader');
 * const config = configLoader.getConfig();
 *
 * @requires fs
 * @requires path
 * @requires ./logger
 */

const fs = require("fs");
const path = require("path");
const logger = require("./logger");

/**
 * Класс для загрузки и управления конфигурацией Husky
 * @class
 */
class ConfigLoader {
  /**
   * Создает экземпляр ConfigLoader
   * @constructor
   */
  constructor() {
    /** @private */
    this.config = null;

    /** @private */
    this.projectRoot = process.cwd();

    /** @private */
    this.configPath = null;

    /** @private */
    this.isConfigLoaded = false;
  }

  /**
   * Определяет тип проекта на основе конфигурационных файлов и зависимостей
   * @method
   * @private
   * @returns {('nextjs'|'vite'|'common')} Тип проекта
   */
  detectProjectType() {
    const files = fs.readdirSync(this.projectRoot);

    // Проверка конфигурационных файлов
    if (files.some((f) => /^next\.config\.(js|ts|mjs|cjs)$/.test(f))) {
      return "nextjs";
    }
    if (files.some((f) => /^vite\.config\.(js|ts|mjs|cjs)$/.test(f))) {
      return "vite";
    }
    // if (files.some((f) => /^angular\.json$/.test(f))) {
    //   return "angular";
    // }
    // if (files.some((f) => /^nuxt\.config\.(js|ts)$/.test(f))) {
    //   return "nuxt";
    // }

    // Проверка зависимостей в package.json
    try {
      const pkgPath = path.join(this.projectRoot, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.peerDependencies,
        };

        if (allDeps.next || allDeps["nextjs"]) {
          return "nextjs";
        }
        if (allDeps.vite) {
          return "vite";
        }
        // if (allDeps["@angular/core"]) {
        //   return "angular";
        // }
        // if (allDeps.nuxt || allDeps["nuxt3"]) {
        //   return "nuxt";
        // }
        if (allDeps.react && !allDeps.next) {
          return "react";
        }
      }
    } catch (error) {
      logger.debug(`Не удалось прочитать package.json: ${error.message}`);
    }

    return "common";
  }

  /**
   * Находит путь к конфигурационному файлу hooks-config.js
   * @method
   * @private
   * @returns {string|null} Абсолютный путь к файлу конфигурации
   */
  findConfigPath() {
    // Возможные пути к конфигурации (относительно текущего файла)
    const possiblePaths = [
      // При запуске из .husky/scripts/utils/config-loader.js
      path.join(__dirname, "..", "..", "configs", "hooks-config.js"),

      // При запуске из .husky/configs (если конфиг там)
      path.join(this.projectRoot, ".husky", "configs", "hooks-config.js"),

      // При запуске из корня проекта (тестирование)
      path.join(this.projectRoot, "configs", "hooks-config.js"),

      // При запуске через npx (временная директория)
      path.join(__dirname, "..", "..", "..", "configs", "hooks-config.js"),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        logger.debug(`Конфигурация найдена: ${configPath}`);
        return configPath;
      }
    }

    return null;
  }

  /**
   * Загружает конфигурацию с fallback на дефолтные значения
   * @method
   * @private
   * @param {string} projectType - Тип проекта
   * @returns {Object} Конфигурация
   */
  loadConfigWithFallback(projectType) {
    const configPath = this.findConfigPath();

    if (!configPath) {
      logger.warn(
        "⚠️  Конфигурационный файл не найден, использую дефолтные настройки"
      );
      return this.getDefaultConfig(projectType);
    }

    try {
      // Очищаем кэш require для возможности горячей перезагрузки
      delete require.cache[require.resolve(configPath)];

      const hooksConfig = require(configPath);

      // Поддерживаем разные форматы экспорта
      if (typeof hooksConfig === "function") {
        return hooksConfig(projectType);
      } else if (
        hooksConfig.default &&
        typeof hooksConfig.default === "function"
      ) {
        return hooksConfig.default(projectType);
      } else if (
        hooksConfig.getConfig &&
        typeof hooksConfig.getConfig === "function"
      ) {
        return hooksConfig.getConfig(projectType);
      } else {
        logger.warn("⚠️  Неизвестный формат конфигурации, использую дефолт");
        return this.getDefaultConfig(projectType);
      }
    } catch (error) {
      logger.error(`❌ Ошибка загрузки конфигурации: ${error.message}`);
      logger.error(`🔍 Stack trace: ${error.stack}`);
      return this.getDefaultConfig(projectType);
    }
  }

  /**
   * Создает дефолтную конфигурацию
   * @method
   * @private
   * @param {string} projectType - Тип проекта
   * @returns {Object} Дефолтная конфигурация
   */
  getDefaultConfig(projectType) {
    return {
      meta: {
        projectType,
        environment: process.env.NODE_ENV || "development",
        configVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        isDefault: true,
      },
      general: {
        projectRoot: this.projectRoot,
        projectType,
        skipCI: process.env.CI === "true",
        verbose: process.env.HUSKY_VERBOSE === "true",
        configPath: ".husky-config.json",
      },
      preCommit: {
        enabled: true,
        checks: [
          { name: "lint-staged", enabled: true, critical: true },
          { name: "typescript", enabled: true, critical: true },
        ],
        timeout: 10000,
        skipPattern: /^wip:|^fixup!|^squash!|^draft:/i,
      },
      prePush: {
        enabled: true,
        checks: [{ name: "build", enabled: true, critical: true }],
        timeout: 120000,
        skipBranches: ["main", "master", "develop"],
      },
      commitMsg: {
        enabled: true,
        pattern:
          /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert)(\(.+\))?: .+/,
        minLength: 10,
        maxLength: 100,
        examples: [
          "feat(button): добавить новую вариацию",
          "fix(modal): исправить закрытие по клику",
          "docs: обновить документацию API",
        ],
      },
    };
  }

  /**
   * Загружает конфигурацию из файла
   * @method
   * @public
   * @returns {Object} Загруженная конфигурация
   */
  loadConfig() {
    if (this.isConfigLoaded && this.config) {
      return this.config;
    }

    const projectType = this.detectProjectType();

    if (process.env.HUSKY_VERBOSE === "true") {
      logger.info(`🎯 Обнаружен проект: ${projectType.toUpperCase()}`);
    }

    // Загружаем конфигурацию
    this.config = this.loadConfigWithFallback(projectType);

    // Сохраняем информацию о конфигурации
    this.saveProjectConfig(projectType);

    this.isConfigLoaded = true;

    if (this.config.meta?.isDefault) {
      logger.warn("⚠️  Используется дефолтная конфигурация");
    } else if (process.env.HUSKY_VERBOSE === "true") {
      logger.info("✅ Конфигурация загружена");
    }

    return this.config;
  }

  /**
   * Сохраняет информацию о конфигурации в проекте
   * @method
   * @private
   * @param {string} projectType - Тип проекта
   */
  saveProjectConfig(projectType) {
    try {
      const configPath = path.join(this.projectRoot, ".husky-config.json");

      const configInfo = {
        version: "1.0.0",
        projectType: projectType,
        configType: this.config.meta?.isDefault ? "default" : "custom",
        installed: new Date().toISOString(),
        source: "unified-husky-advanced",
        environment: process.env.NODE_ENV || "development",
        hooks: {
          preCommit: this.config.preCommit?.enabled || false,
          prePush: this.config.prePush?.enabled || false,
          commitMsg: this.config.commitMsg?.enabled || false,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(configInfo, null, 2));

      if (process.env.HUSKY_VERBOSE === "true") {
        logger.debug(`💾 Конфигурация сохранена: ${configPath}`);
      }
    } catch (error) {
      logger.warn(
        `⚠️  Не удалось сохранить информацию о конфигурации: ${error.message}`
      );
    }
  }

  /**
   * Получает конфигурацию (загружает если нужно)
   * @method
   * @public
   * @returns {Object} Конфигурация
   */
  getConfig() {
    return this.loadConfig();
  }

  /**
   * Сбрасывает кэш конфигурации (для тестирования)
   * @method
   * @public
   */
  clearCache() {
    this.config = null;
    this.isConfigLoaded = false;
    logger.debug("🧹 Кэш конфигурации очищен");
  }

  /**
   * Получает информацию о загруженной конфигурации
   * @method
   * @public
   * @returns {Object} Информация о конфигурации
   */
  getConfigInfo() {
    const config = this.getConfig();
    return {
      projectType: config.meta?.projectType || "unknown",
      environment: config.meta?.environment || "development",
      version: config.meta?.configVersion || "1.0.0",
      isDefault: config.meta?.isDefault || false,
      hooks: {
        preCommit: config.preCommit?.enabled,
        prePush: config.prePush?.enabled,
        commitMsg: config.commitMsg?.enabled,
      },
    };
  }
}

// Создаем singleton экземпляр
const configLoader = new ConfigLoader();

// Экспортируем singleton и класс для тестирования
module.exports = configLoader;
module.exports.ConfigLoader = ConfigLoader;

// Дополнительные утилиты
module.exports.utils = {
  /**
   * Быстрое получение конфига для типа проекта
   * @param {string} projectType - Тип проекта
   * @returns {Object} Конфигурация
   */
  getConfigForType: (projectType) => {
    const loader = new ConfigLoader();
    // Временная замена projectRoot для определения типа
    loader.projectRoot = process.cwd();
    return loader.loadConfigWithFallback(projectType);
  },

  /**
   * Проверяет, существует ли конфигурационный файл
   * @returns {boolean}
   */
  hasConfigFile: () => {
    const loader = new ConfigLoader();
    return loader.findConfigPath() !== null;
  },
};
