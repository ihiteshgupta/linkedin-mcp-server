#!/usr/bin/env node

import { authenticateInteractive, getConfigDir } from "./auth.js";

async function main() {
  console.log("LinkedIn MCP Server - Authentication");
  console.log("====================================\n");
  console.log(`Config directory: ${getConfigDir()}\n`);

  try {
    await authenticateInteractive();
    process.exit(0);
  } catch (error) {
    console.error("Authentication failed:", error);
    process.exit(1);
  }
}

main();
