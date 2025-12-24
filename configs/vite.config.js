// \configs\vite.config.js
module.exports = {
  // Специфичные зависимости для Vite
  dependencies: {
    "@vitejs/plugin-react": "^4.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
  },

  // Дополнительные проверки для Vite
  additionalChecks: {
    preCommit: [{ name: "vite-type-check", enabled: true, critical: true }],
    prePush: [{ name: "vite-build", enabled: true, critical: true }],
  },

  // Скрипты для package.json
  scripts: {
    "lint:vite": "eslint . --ext .js,.jsx,.ts,.tsx --fix --quiet",
    "build:vite": "vite build",
    "type-check": "tsc --noEmit --skipLibCheck",
  },

  // Конфигурация lint-staged для Vite
  lintStaged: {
    "**/*.{js,jsx,ts,tsx,vue}": [
      "eslint --fix --max-warnings=0",
      "prettier --write",
    ],
    "**/*.{css,scss,less,vue}": ["prettier --write"],
    "**/*.{md,json}": ["prettier --write"],
  },

  // ESLint конфиг для Vite
  eslintConfig: {
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:react-hooks/recommended",
    ],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "react-hooks"],
  },
};
