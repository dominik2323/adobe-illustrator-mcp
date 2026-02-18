#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";

// Execute JSX script in Illustrator via AppleScript
function executeJsx(script: string): { success: boolean; result?: unknown; error?: string } {
  // Escape the script for AppleScript string
  const escaped = script
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

  const appleScript = `tell application "Adobe Illustrator" to do javascript "${escaped}"`;

  try {
    const result = execSync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, {
      encoding: "utf-8",
      timeout: 30000,
    });

    // Try to parse as JSON if possible
    try {
      return { success: true, result: JSON.parse(result.trim()) };
    } catch {
      return { success: true, result: result.trim() };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Create MCP server
const server = new McpServer({
  name: "illustrator-mcp",
  version: "1.0.0",
});

// Register the draw_circle tool
server.tool(
  "illustrator_draw_circle",
  "Draw a circle in Adobe Illustrator. Requires an open document.",
  {
    centerX: z.number().describe("X coordinate of circle center in points"),
    centerY: z.number().describe("Y coordinate of circle center in points"),
    radius: z.number().positive().describe("Radius of the circle in points"),
    fillColor: z
      .object({
        r: z.number().min(0).max(255).describe("Red component (0-255)"),
        g: z.number().min(0).max(255).describe("Green component (0-255)"),
        b: z.number().min(0).max(255).describe("Blue component (0-255)"),
      })
      .optional()
      .describe("Optional RGB fill color"),
  },
  async ({ centerX, centerY, radius, fillColor }) => {
    // Build JSX script
    // Illustrator's ellipse() takes: top, left, width, height
    // top = centerY + radius (upper edge)
    // left = centerX - radius (left edge)
    const top = centerY + radius;
    const left = centerX - radius;
    const diameter = radius * 2;

    let jsx = `
      (function() {
        try {
          var doc = app.activeDocument;
          var circle = doc.pathItems.ellipse(${top}, ${left}, ${diameter}, ${diameter});
    `;

    if (fillColor) {
      jsx += `
          var color = new RGBColor();
          color.red = ${fillColor.r};
          color.green = ${fillColor.g};
          color.blue = ${fillColor.b};
          circle.fillColor = color;
          circle.filled = true;
      `;
    }

    jsx += `
          return '{"success":true,"data":{"type":"circle","centerX":${centerX},"centerY":${centerY},"radius":${radius},"bounds":{"top":' + circle.top + ',"left":' + circle.left + ',"width":' + circle.width + ',"height":' + circle.height + '}}}';
        } catch (e) {
          return '{"success":false,"error":"' + (e.message || String(e)).replace(/"/g, '\\\\"') + '"}';
        }
      })();
    `;

    const result = executeJsx(jsx);

    if (!result.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    // Parse the result from Illustrator
    const jsxResult = result.result as { success: boolean; data?: unknown; error?: string };

    if (!jsxResult.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Illustrator error: ${jsxResult.error}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(jsxResult.data, null, 2),
        },
      ],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Illustrator MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
