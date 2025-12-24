#!/usr/bin/env node

/**
 * @file install.js
 * @version 1.0.0
 * @description Husky Configuration Installer
 * @module AdvancedHuskyInstaller
 * @author GorkinN
 * @license MIT
 *
 * @overview
 * Автоматический установщик и настройщик Husky для проектов на JavaScript/TypeScript.
 * Скрипт настраивает систему контроля качества кода через Git хуки с модульной конфигурацией.
 *
 * @example
 * // Запуск установки:
 * // node install.js
 * // или
 * // ./install.js
 *
 * @requires fs
 * @requires path
 * @requires child_process
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log(`
┌─────────────────────────────────────────┐
│       Husky Configuration v1.0.0        │
└─────────────────────────────────────────┘
`);

/**
 * Временный логгер для использования до загрузки основного логгера из файла
 * @type {Object}
 * @property {Function} info - Логирует информационное сообщение
 * @property {Function} success - Логирует сообщение об успехе
 * @property {Function} warn - Логирует предупреждение
 * @property {Function} error - Логирует сообщение об ошибке
 * @property {Function} debug - Логирует отладочное сообщение (только при DEBUG=true)
 */
const tempLogger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`🔍 ${msg}`),
};

/**
 * Класс для установки и настройки Advanced Husky Configuration
 * @class
 * @classdesc Основной класс установщика, выполняющий все этапы настройки Husky
 *
 * @property {string} projectRoot - Путь к корневой директории проекта
 * @property {Object} logger - Экземпляр логгера (временный или загруженный из файла)
 *
 * @example
 * // Создание и запуск установщика
 * const installer = new AdvancedHuskyInstaller();
 * installer.install();
 */
class AdvancedHuskyInstaller {
  /**
   * Создает экземпляр AdvancedHuskyInstaller
   * @constructor
   */
  constructor() {
    /**
     * Корневая директория проекта (текущая рабочая директория)
     * @type {string}
     * @public
     */
    this.projectRoot = process.cwd();

    /**
     * Экземпляр логгера для вывода сообщений
     * @type {Object}
     * @public
     */
    this.logger = tempLogger; // Временный логгер
  }

  /**
   * Загружает основной логгер из файла, если он существует
   * @method
   * @private
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * Пытается загрузить логгер из файла scripts/utils/logger.js.
   * Если файл не найден или произошла ошибка, оставляет временный логгер.
   *
   * @example
   * await installer.loadLogger();
   */
  async loadLogger() {
    try {
      const loggerPath = path.join(__dirname, "scripts", "utils", "logger.js");
      if (fs.existsSync(loggerPath)) {
        this.logger = require(loggerPath);
      }
    } catch (error) {
      // Оставляем временный логгер
    }
  }

  /**
   * Определяет тип проекта на основе конфигурационных файлов
   * @method
   * @public
   * @returns {('nextjs'|'vite'|'common')} Тип проекта
   *
   * @description
   * Анализирует файлы в корне проекта для определения фреймворка/сборщика.
   * Проверяет наличие конфигурационных файлов Next.js или Vite.
   *
   * @example
   * const type = installer.detectProjectType();
   * console.log(`Проект: ${type}`); // "nextjs", "vite" или "common"
   */
  detectProjectType() {
    const files = fs.readdirSync(this.projectRoot);

    if (files.some((f) => /^next\.config\.(js|ts|mjs)$/.test(f))) {
      return "nextjs";
    }
    if (files.some((f) => /^vite\.config\.(js|ts|mjs)$/.test(f))) {
      return "vite";
    }
    return "common";
  }

  /**
   * Основной метод установки
   * @method
   * @public
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * Выполняет полный цикл установки и настройки Husky:
   * 1. Определение типа проекта
   * 2. Установка зависимостей
   * 3. Настройка Husky
   * 4. Конфигурация package.json
   *
   * @throws {Error} Если произошла ошибка на любом этапе установки
   *
   * @example
   * try {
   *   await installer.install();
   *   console.log('Установка завершена успешно!');
   * } catch (error) {
   *   console.error('Ошибка установки:', error.message);
   * }
   */
  async install() {
    try {
      await this.loadLogger(); // Загружаем логгер

      const projectType = this.detectProjectType();
      this.logger.info(`🎯 Проект: ${projectType.toUpperCase()}`);

      // 1. Устанавливаем зависимости
      await this.installDependencies();

      // 2. Настраиваем Husky
      await this.setupHusky();

      // 3. Настраиваем package.json
      await this.setupPackageJson(projectType);

      this.logger.success("\n✅ Husky настроен!");
      this.showNextSteps(projectType);
    } catch (error) {
      this.logger.error(`❌ Ошибка: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Устанавливает необходимые зависимости (Husky и lint-staged)
   * @method
   * @private
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * Устанавливает dev-зависимости через npm или yarn.
   * При неудаче с npm пробует yarn.
   *
   * @throws {Error} Если не удалось установить зависимости ни через npm, ни через yarn
   *
   * @example
   * // Установка с дефолтными версиями
   * await installer.installDependencies();
   *
   * // Установка с кастомными версиями через переменные окружения
   * process.env.HUSKY_VERSION = "9.0.0";
   * process.env.LINT_STAGED_VERSION = "14.0.0";
   * await installer.installDependencies();
   */
  async installDependencies() {
    this.logger.info("📦 Устанавливаем Husky и lint-staged...");

    /**
     * Фиксированные версии зависимостей по умолчанию
     * @constant
     * @type {Object}
     * @property {string} HUSKY - Версия Husky (8.0.3)
     * @property {string} LINT_STAGED - Версия lint-staged (13.3.0)
     */
    const FIXED_VERSIONS = {
      HUSKY: "8.0.3", // Последняя стабильная 8.x
      LINT_STAGED: "13.3.0", // Последняя стабильная 13.x
    };

    /**
     * Очищает версию от символов caret (^) и тильды (~)
     * @private
     * @param {string} envVar - Имя переменной окружения
     * @param {string} fixed - Фиксированное значение по умолчанию
     * @returns {string} Очищенная версия
     */
    const getCleanVersion = (envVar, fixed) => {
      const version = process.env[envVar] || fixed;
      // Убираем caret, тильду и другие диапазоны
      return version.replace(/^[~^]/, "");
    };

    /**
     * Конфигурация версий для установки
     * @type {Object}
     */
    const CONFIG = {
      versions: {
        husky: getCleanVersion("HUSKY_VERSION", FIXED_VERSIONS.HUSKY),
        lintStaged: getCleanVersion(
          "LINT_STAGED_VERSION",
          FIXED_VERSIONS.LINT_STAGED
        ),
      },
    };

    this.logger.info(`Устанавливаем фиксированные версии: 
    husky@${CONFIG.versions.husky}, 
    lint-staged@${CONFIG.versions.lintStaged}`);

    try {
      execSync(
        `npm install --save-dev husky@${CONFIG.versions.husky} lint-staged@${CONFIG.versions.lintStaged}`,
        { stdio: "inherit" }
      );
    } catch (error) {
      this.logger.warn("⚠️  Пробуем yarn...");
      execSync(
        `yarn add --dev husky@${CONFIG.versions.husky} lint-staged@${CONFIG.versions.lintStaged}`,
        { stdio: "inherit" }
      );
    }
  }

  /**
   * Настраивает Husky: инициализация и создание хуков
   * @method
   * @private
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * Выполняет:
   * 1. Инициализацию Husky (npx husky init)
   * 2. Создание кастомных хуков
   * 3. Настройку прав доступа
   * 4. Создание структуры директорий для скриптов
   *
   * @throws {Error} Если не удалось инициализировать Husky
   *
   * @example
   * await installer.setupHusky();
   */
  async setupHusky() {
    this.logger.info("🔧 Настраиваем Husky...");
    try {
      execSync("npx husky init", { stdio: "inherit" });
      this.logger.success("✓ Husky инициализирован");
    } catch (error) {
      this.logger.error("❌ Не удалось инициализировать Husky");
      this.logger.error(`Причина: ${error.message}`);
      throw error;
    }

    const huskyDir = path.join(this.projectRoot, ".husky");
    // Проверяем, что husky создал директорию
    if (!fs.existsSync(huskyDir)) {
      this.logger.error("❌ Директория .husky не создана");
      throw new Error("Husky initialization failed - no .husky directory");
    }

    // 1. Копируем хуки (файлы напрямую в hooks/)
    const hooks = ["pre-commit.js", "commit-msg.js", "pre-push.js"];
    let hooksCopied = 0;

    hooks.forEach((hookFile) => {
      // Копируем из hooks/ директории
      const copied = this.copyFile(hookFile, huskyDir, "hooks");

      if (copied) {
        // Делаем исполняемым
        const target = path.join(huskyDir, hookFile.replace(".js", ""));
        try {
          fs.chmodSync(target, "755");
          hooksCopied++;
          this.logger.info(`✓ Хук создан: .husky/${path.basename(target)}`);
        } catch (chmodError) {
          this.logger.warn(
            `⚠️  Не удалось сделать хук исполняемым: ${chmodError.message}`
          );
        }
      } else {
        this.logger.warn(`⚠️  Не удалось скопировать хук: ${hookFile}`);
      }
    });

    if (hooksCopied === 0) {
      this.logger.warn("⚠️  Не скопировано ни одного хука!");
    } else {
      this.logger.success(
        `✓ Скопировано хуков: ${hooksCopied}/${hooks.length}`
      );
    }

    // 2. Создаем директории
    const configsDir = path.join(huskyDir, "configs");
    const scriptsDir = path.join(huskyDir, "scripts");

    [configsDir, scriptsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.info(
          `✓ Директория создана: ${path.relative(this.projectRoot, dir)}`
        );
      }
    });

    // 3. Копируем основной конфиг с fallback
    const configCopied = this.copyFile(
      "hooks-config.js",
      configsDir,
      "configs"
    );
    if (!configCopied) {
      this.logger.warn("⚠️  Основной конфиг не найден, создаю дефолтный...");
      this.createDefaultConfig(path.join(configsDir, "hooks-config.js"));
    }

    // 4. Копируем утилиты и проверки
    const scriptFiles = [
      "utils/config-loader.js",
      "utils/logger.js",
      "checks/typescript.js",
      "checks/lint-staged.js",
      "checks/build.js",
      "checks/security.js",
    ];

    let scriptsCopied = 0;
    scriptFiles.forEach((filePath) => {
      const copied = this.copyFile(filePath, scriptsDir, "scripts");
      if (copied) scriptsCopied++;
    });

    this.logger.success(
      `✓ Скопировано скриптов: ${scriptsCopied}/${scriptFiles.length}`
    );

    // Проверяем критически важные файлы
    const criticalFiles = [
      path.join(scriptsDir, "utils", "config-loader.js"),
      path.join(scriptsDir, "utils", "logger.js"),
    ];

    const missingCritical = criticalFiles.filter(
      (file) => !fs.existsSync(file)
    );
    if (missingCritical.length > 0) {
      this.logger.error("❌ Отсутствуют критические файлы:");
      missingCritical.forEach((file) => {
        this.logger.error(`   - ${path.relative(this.projectRoot, file)}`);
      });
      throw new Error("Missing critical files");
    }
  }

  /**
   * Создает дефолтную конфигурацию если основной файл не найден
   * @method
   * @private
   * @param {string} configPath - Путь для сохранения конфигурации
   *
   * @description
   * Создает файл с дефолтной конфигурацией Husky хуков.
   * Используется как fallback, если основной файл конфигурации не найден.
   *
   * @example
   * this.createDefaultConfig('/path/to/hooks-config.js');
   */
  createDefaultConfig(configPath) {
    const defaultConfig = `module.exports = function getConfig(projectType) {
  return {
    preCommit: {
      enabled: true,
      checks: [
        { name: "lint-staged", enabled: true, critical: true },
        { name: "typescript", enabled: true, critical: true },
      ],
      timeout: 10000,
      skipPattern: /^wip:|^fixup!|^squash!/i,
    },
    prePush: {
      enabled: true,
      checks: [
        { name: "build", enabled: true, critical: true },
      ],
      timeout: 120000,
      skipBranches: ["main", "master", "develop"],
    },
    commitMsg: {
      enabled: true,
      pattern: /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert)(\\\\(.+\\\\\\))?: .+/,
      minLength: 10,
      maxLength: 100,
    },
    general: {
      projectRoot: process.cwd(),
      projectType: projectType,
      skipCI: process.env.CI === "true",
      verbose: process.env.HUSKY_VERBOSE === "true",
    },
  };
};`;

    fs.writeFileSync(configPath, defaultConfig);
    this.logger.info("✓ Создан дефолтный конфиг hooks-config.js");
  }

  /**
   * Копирует файл с учетом базовой директории
   * @method
   * @private
   * @param {string} sourcePath - Относительный путь к исходному файлу
   * @param {string} targetDir - Целевая директория для копирования
   * @param {string} baseDir - Базовая директория источника ('scripts', 'configs', 'hooks' или '')
   * @returns {boolean} true если копирование успешно, false в противном случае
   *
   * @description
   * Копирует файл из указанной базовой директории в целевую директорию.
   * Создает целевую директорию, если она не существует.
   *
   * @example
   * // Копирование хука
   * this.copyFile('pre-commit.js', '.husky', 'hooks');
   *
   * // Копирование скрипта
   * this.copyFile('utils/logger.js', '.husky/scripts', 'scripts');
   *
   * // Копирование конфига
   * this.copyFile('hooks-config.js', '.husky/configs', 'configs');
   */
  copyFile(sourcePath, targetDir, baseDir = "scripts") {
    const source = path.join(__dirname, baseDir, sourcePath);
    const target = path.join(targetDir, path.basename(sourcePath));

    if (!fs.existsSync(source)) {
      this.logger.warn(`⚠️  Файл не найден: ${source}`);
      return false;
    }

    try {
      if (!fs.existsSync(path.dirname(target))) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
      }
      fs.copyFileSync(source, target);
      this.logger.debug(
        `Файл скопирован: ${path.relative(this.projectRoot, target)}`
      );
      return true;
    } catch (error) {
      this.logger.error(`❌ Ошибка копирования: ${error.message}`);
      return false;
    }
  }

  /**
   * Настраивает package.json для работы с Husky
   * @method
   * @private
   * @async
   * @param {('nextjs'|'vite'|'common')} projectType - Тип проекта
   * @returns {Promise<void>}
   *
   * @description
   * Добавляет в package.json:
   * 1. Скрипт prepare для автоматической установки Husky
   * 2. Конфигурацию lint-staged для автоформатирования
   *
   * Если package.json не существует, создает минимальную версию.
   *
   * @throws {Error} Если не удалось прочитать или записать package.json
   *
   * @example
   * await installer.setupPackageJson('nextjs');
   */
  async setupPackageJson(projectType) {
    this.logger.info("📝 Настраиваем package.json...");

    const pkgPath = path.join(this.projectRoot, "package.json");
    if (!fs.existsSync(pkgPath)) {
      this.logger.warn("⚠️  package.json не найден, создаем минимальный...");
      const minimalPkg = {
        name: "my-project",
        version: "1.0.0",
        scripts: {},
        devDependencies: {},
      };
      fs.writeFileSync(pkgPath, JSON.stringify(minimalPkg, null, 2));
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

    // Добавляем prepare скрипт
    pkg.scripts = {
      ...pkg.scripts,
      prepare: "husky install",
    };

    // Добавляем lint-staged конфигурацию
    pkg["lint-staged"] = {
      "**/*.{js,jsx,ts,tsx}": [
        "prettier --write",
        "eslint --fix --max-warnings=0",
      ],
      "**/*.{css,scss}": ["prettier --write"],
      "**/*.{md,json}": ["prettier --write"],
    };

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    this.logger.info("✓ package.json обновлен");
  }

  /**
   * Показывает следующие шаги после установки
   * @method
   * @private
   * @param {('nextjs'|'vite'|'common')} projectType - Тип проекта
   *
   * @description
   * Выводит в консоль инструкции для завершения настройки
   * и тестирования работы Husky.
   *
   * @example
   * installer.showNextSteps('nextjs');
   */
  showNextSteps(projectType) {
    console.log("\n📋 Следующие шаги:");
    console.log("   1. Установите дополнительные зависимости:");
    console.log("      npm install --save-dev eslint prettier");
    if (projectType === "nextjs") {
      console.log(
        "      npm install --save-dev @next/eslint-plugin-next eslint-config-next"
      );
    }
    console.log("\n   2. Протестируйте:");
    console.log("      git add .");
    console.log('      git commit -m "feat: test husky configuration"');
    console.log("\n   3. Конфигурация в: .husky/configs/hooks-config.js");
    console.log(
      "   4. Для кастомизации отредактируйте файлы в .husky/scripts/"
    );
  }
}

// Запуск
/**
 * Точка входа скрипта
 * Создает экземпляр установщика и запускает установку
 *
 * @example
 * // Запуск из командной строки:
 * // node install.js
 *
 * @listens process#exit
 * @exitcode 0 Успешное завершение
 * @exitcode 1 Ошибка во время установки
 */
const installer = new AdvancedHuskyInstaller();
installer.install();
