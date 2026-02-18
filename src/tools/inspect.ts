import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runJsx, formatResult } from "../executor.js";
import { z } from "zod";

export const CapturePreviewSchema = {
  filePath: z.string().describe("Path to save the preview PNG (e.g., /tmp/preview.png)"),
  scale: z.number().positive().optional().default(1).describe("Export scale (1 = 100%)"),
};

export function registerInspectTools(server: McpServer): void {
  // ============ Get All Items ============
  server.tool(
    "illustrator_get_all_items",
    "Get detailed information about all objects in the active document, including type, position, size, colors, and names",
    {},
    async () => {
      const jsx = `
        var doc = app.activeDocument;
        var items = [];

        function getRGBColor(color) {
          if (color && color.typename === "RGBColor") {
            return { r: Math.round(color.red), g: Math.round(color.green), b: Math.round(color.blue) };
          } else if (color && color.typename === "GrayColor") {
            var gray = Math.round(255 * (1 - color.gray / 100));
            return { r: gray, g: gray, b: gray };
          } else if (color && color.typename === "NoColor") {
            return null;
          }
          return null;
        }

        function getItemInfo(item, index) {
          var info = {
            index: index,
            type: item.typename,
            name: item.name || "",
            bounds: {
              left: Math.round(item.left * 100) / 100,
              top: Math.round(item.top * 100) / 100,
              width: Math.round(item.width * 100) / 100,
              height: Math.round(item.height * 100) / 100
            },
            visible: item.hidden !== true,
            locked: item.locked === true
          };

          if (item.typename === "PathItem") {
            info.filled = item.filled;
            info.stroked = item.stroked;
            info.closed = item.closed;
            info.pointCount = item.pathPoints.length;
            if (item.filled && item.fillColor) {
              info.fillColor = getRGBColor(item.fillColor);
            }
            if (item.stroked && item.strokeColor) {
              info.strokeColor = getRGBColor(item.strokeColor);
              info.strokeWidth = item.strokeWidth;
            }
          } else if (item.typename === "TextFrame") {
            info.contents = item.contents.substring(0, 100);
            try {
              info.fontSize = item.textRange.characterAttributes.size;
            } catch(e) {}
          } else if (item.typename === "GroupItem") {
            info.itemCount = item.pageItems.length;
            info.children = [];
            for (var j = 0; j < item.pageItems.length; j++) {
              info.children.push(getItemInfo(item.pageItems[j], j));
            }
          } else if (item.typename === "CompoundPathItem") {
            info.pathCount = item.pathItems.length;
          } else if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
            try {
              info.file = item.file ? item.file.fsName : null;
            } catch(e) {}
          }

          return info;
        }

        for (var i = 0; i < doc.pageItems.length; i++) {
          var item = doc.pageItems[i];
          // Skip items inside groups (they'll be listed as children)
          if (item.parent && item.parent.typename === "GroupItem") {
            continue;
          }
          items.push(getItemInfo(item, i));
        }

        return {
          documentName: doc.name,
          documentSize: { width: doc.width, height: doc.height },
          itemCount: doc.pageItems.length,
          topLevelItems: items.length,
          items: items
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Capture Preview ============
  server.tool(
    "illustrator_capture_preview",
    "Export a preview PNG of the active document that can be viewed by Claude",
    CapturePreviewSchema,
    async ({ filePath, scale }) => {
      const escapedPath = filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const jsx = `
        var doc = app.activeDocument;
        var exportFile = new File("${escapedPath}");
        var exportOptions = new ExportOptionsPNG24();
        exportOptions.transparency = true;
        exportOptions.artBoardClipping = true;
        exportOptions.horizontalScale = ${(scale || 1) * 100};
        exportOptions.verticalScale = ${(scale || 1) * 100};
        doc.exportFile(exportFile, ExportType.PNG24, exportOptions);
        return {
          exported: true,
          path: "${escapedPath}",
          documentName: doc.name,
          documentSize: { width: doc.width, height: doc.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );
}
