// scripts\utils\logger.js
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message) {
    console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
  }

  success(message) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
  }

  error(message) {
    console.error(`${colors.red}✗ ${message}${colors.reset}`);
  }

  warn(message) {
    console.warn(`${colors.yellow}⚠ ${message}${colors.reset}`);
  }

  debug(message) {
    if (this.verbose) {
      console.log(`${colors.dim}🐛 ${message}${colors.reset}`);
    }
  }
}

module.exports = new Logger(process.env.HUSKY_VERBOSE === "true");
