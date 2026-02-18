#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

// Create MCP server
const server = new McpServer({
  name: "illustrator-mcp",
  version: "1.0.0",
});

// Register all tools
registerAllTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Illustrator MCP server started");
  console.error("Tools: document (6), shapes (8), objects (12) = 26 total");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
