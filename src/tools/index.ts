import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDocumentTools } from "./document.js";
import { registerShapeTools } from "./shapes.js";
import { registerObjectTools } from "./objects.js";
import { registerInspectTools } from "./inspect.js";

export function registerAllTools(server: McpServer): void {
  registerDocumentTools(server);
  registerShapeTools(server);
  registerObjectTools(server);
  registerInspectTools(server);
}
