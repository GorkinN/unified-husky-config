// \configs\nextjs.config.js
module.exports = {
  // Специфичные зависимости для Next.js
  dependencies: {
    "@next/eslint-plugin-next": "^14.0.0",
    "eslint-config-next": "^14.0.0",
    next: "^14.0.0",
  },

  // Дополнительные проверки для Next.js
  additionalChecks: {
    preCommit: [{ name: "next-lint", enabled: true, critical: true }],
    prePush: [
      { name: "next-build", enabled: true, critical: true },
      { name: "next-security", enabled: true, critical: false },
    ],
  },

  // Скрипты для package.json
  scripts: {
    "lint:next": "next lint --fix --quiet",
    "build:next": "next build",
    "type-check": "tsc --noEmit --skipLibCheck",
  },

  // Конфигурация lint-staged для Next.js
  lintStaged: {
    "**/*.{js,jsx,ts,tsx}": ["next lint --fix", "prettier --write"],
    "**/*.{css,scss}": ["prettier --write"],
    "**/*.{md,json}": ["prettier --write"],
  },

  // ESLint конфиг для Next.js
  eslintConfig: {
    extends: ["next/core-web-vitals"],
    rules: {
      "@next/next/no-html-link-for-pages": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
};
