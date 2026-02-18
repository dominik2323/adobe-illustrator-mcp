import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runJsx, formatResult } from "../executor.js";
import {
  CreateRectangleSchema,
  CreateEllipseSchema,
  CreatePolygonSchema,
  CreateStarSchema,
  CreateLineSchema,
  CreatePathSchema,
  CreateTextSchema,
  CreateCircleSchema,
  RGBColor,
} from "../types.js";

// Helper to generate JSX color assignment
function colorJsx(varName: string, color: RGBColor | undefined, property: "fillColor" | "strokeColor"): string {
  if (!color) return "";
  return `
    var ${varName} = new RGBColor();
    ${varName}.red = ${color.r};
    ${varName}.green = ${color.g};
    ${varName}.blue = ${color.b};
    item.${property} = ${varName};
    item.${property === "fillColor" ? "filled" : "stroked"} = true;
  `;
}

export function registerShapeTools(server: McpServer): void {
  // ============ Create Rectangle ============
  server.tool(
    "illustrator_create_rectangle",
    "Create a rectangle in the active document",
    CreateRectangleSchema,
    async ({ x, y, width, height, fillColor, strokeColor, strokeWidth }) => {
      const jsx = `
        var doc = app.activeDocument;
        var item = doc.pathItems.rectangle(${y}, ${x}, ${width}, ${height});
        ${colorJsx("fill", fillColor, "fillColor")}
        ${colorJsx("stroke", strokeColor, "strokeColor")}
        ${strokeWidth ? `item.strokeWidth = ${strokeWidth};` : ""}
        return {
          type: "rectangle",
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Create Ellipse ============
  server.tool(
    "illustrator_create_ellipse",
    "Create an ellipse in the active document",
    CreateEllipseSchema,
    async ({ x, y, width, height, fillColor, strokeColor, strokeWidth }) => {
      const jsx = `
        var doc = app.activeDocument;
        var item = doc.pathItems.ellipse(${y}, ${x}, ${width}, ${height});
        ${colorJsx("fill", fillColor, "fillColor")}
        ${colorJsx("stroke", strokeColor, "strokeColor")}
        ${strokeWidth ? `item.strokeWidth = ${strokeWidth};` : ""}
        return {
          type: "ellipse",
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Create Circle ============
  server.tool(
    "illustrator_draw_circle",
    "Draw a circle in the active document",
    CreateCircleSchema,
    async ({ centerX, centerY, radius, fillColor, strokeColor, strokeWidth }) => {
      // Convert center coordinates to top-left for ellipse()
      const top = centerY + radius;
      const left = centerX - radius;
      const diameter = radius * 2;

      const jsx = `
        var doc = app.activeDocument;
        var item = doc.pathItems.ellipse(${top}, ${left}, ${diameter}, ${diameter});
        ${colorJsx("fill", fillColor, "fillColor")}
        ${colorJsx("stroke", strokeColor, "strokeColor")}
        ${strokeWidth ? `item.strokeWidth = ${strokeWidth};` : ""}
        return {
          type: "circle",
          centerX: ${centerX},
          centerY: ${centerY},
          radius: ${radius},
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Create Polygon ============
  server.tool(
    "illustrator_create_polygon",
    "Create a regular polygon in the active document",
    CreatePolygonSchema,
    async ({ centerX, centerY, radius, sides, fillColor, strokeColor }) => {
      const jsx = `
        var doc = app.activeDocument;
        var item = doc.pathItems.polygon(${centerX}, ${centerY}, ${radius}, ${sides});
        ${colorJsx("fill", fillColor, "fillColor")}
        ${colorJsx("stroke", strokeColor, "strokeColor")}
        return {
          type: "polygon",
          sides: ${sides},
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Create Star ============
  server.tool(
    "illustrator_create_star",
    "Create a star shape in the active document",
    CreateStarSchema,
    async ({ centerX, centerY, outerRadius, innerRadius, points, fillColor, strokeColor }) => {
      const jsx = `
        var doc = app.activeDocument;
        var item = doc.pathItems.star(${centerX}, ${centerY}, ${outerRadius}, ${innerRadius}, ${points});
        ${colorJsx("fill", fillColor, "fillColor")}
        ${colorJsx("stroke", strokeColor, "strokeColor")}
        return {
          type: "star",
          points: ${points},
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Create Line ============
  server.tool(
    "illustrator_create_line",
    "Create a line in the active document",
    CreateLineSchema,
    async ({ startX, startY, endX, endY, strokeColor, strokeWidth }) => {
      const jsx = `
        var doc = app.activeDocument;
        var item = doc.pathItems.add();
        item.setEntirePath([[${startX}, ${startY}], [${endX}, ${endY}]]);
        item.filled = false;
        item.stroked = true;
        item.strokeWidth = ${strokeWidth || 1};
        ${strokeColor ? `
          var stroke = new RGBColor();
          stroke.red = ${strokeColor.r};
          stroke.green = ${strokeColor.g};
          stroke.blue = ${strokeColor.b};
          item.strokeColor = stroke;
        ` : ""}
        return {
          type: "line",
          start: { x: ${startX}, y: ${startY} },
          end: { x: ${endX}, y: ${endY} },
          length: Math.sqrt(Math.pow(${endX} - ${startX}, 2) + Math.pow(${endY} - ${startY}, 2))
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Create Path ============
  server.tool(
    "illustrator_create_path",
    "Create a custom path from points in the active document",
    CreatePathSchema,
    async ({ points, closed, fillColor, strokeColor, strokeWidth }) => {
      const pathPoints = points.map((p) => `[${p.x}, ${p.y}]`).join(", ");
      const jsx = `
        var doc = app.activeDocument;
        var item = doc.pathItems.add();
        item.setEntirePath([${pathPoints}]);
        item.closed = ${closed || false};
        ${closed && fillColor ? colorJsx("fill", fillColor, "fillColor") : "item.filled = false;"}
        ${strokeColor ? colorJsx("stroke", strokeColor, "strokeColor") : "item.stroked = true;"}
        ${strokeWidth ? `item.strokeWidth = ${strokeWidth};` : ""}
        return {
          type: "path",
          pointCount: ${points.length},
          closed: ${closed || false},
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Create Text ============
  server.tool(
    "illustrator_create_text",
    "Create a text element in the active document",
    CreateTextSchema,
    async ({ content, x, y, fontSize, fontName, fillColor }) => {
      const escapedContent = content.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      const jsx = `
        var doc = app.activeDocument;
        var item = doc.textFrames.add();
        item.contents = "${escapedContent}";
        item.position = [${x}, ${y}];
        item.textRange.characterAttributes.size = ${fontSize || 12};
        ${fontName ? `
          try {
            item.textRange.characterAttributes.textFont = app.textFonts.getByName("${fontName}");
          } catch (e) {
            // Font not found, use default
          }
        ` : ""}
        ${fillColor ? `
          var fill = new RGBColor();
          fill.red = ${fillColor.r};
          fill.green = ${fillColor.g};
          fill.blue = ${fillColor.b};
          item.textRange.characterAttributes.fillColor = fill;
        ` : ""}
        return {
          type: "text",
          content: item.contents,
          position: { x: item.position[0], y: item.position[1] },
          fontSize: item.textRange.characterAttributes.size,
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );
}
