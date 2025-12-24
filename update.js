#!/usr/bin/env node
// update.js
const fs = require("fs");
const path = require("path");

console.log("🔄 Checking for updates...");

const configPath = path.join(process.cwd(), ".huskyconfig.json");
if (!fs.existsSync(configPath)) {
  console.log("❌ Husky not configured by unified setup.");
  console.log("Run: npx github:GorkinN/unified-husky-config");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
console.log(`📦 Current version: ${config.version}`);
console.log(`📁 Project type: ${config.projectType}`);

console.log("\n✅ You can update by running:");
console.log("npx github:GorkinN/unified-husky-config --force");
