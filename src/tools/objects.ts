import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runJsx, formatResult } from "../executor.js";
import {
  SelectAllSchema,
  SelectByNameSchema,
  SelectByIndexSchema,
  MoveSelectionSchema,
  ScaleSelectionSchema,
  RotateSelectionSchema,
  SetFillColorSchema,
  SetStrokeColorSchema,
  DuplicateSelectionSchema,
  AlignSelectionSchema,
  DistributeSelectionSchema,
} from "../types.js";

export function registerObjectTools(server: McpServer): void {
  // ============ Select All ============
  server.tool(
    "illustrator_select_all",
    "Select all objects in the active document or layer",
    SelectAllSchema,
    async ({ layerName }) => {
      const jsx = layerName
        ? `
          var doc = app.activeDocument;
          var layer = doc.layers.getByName("${layerName}");
          for (var i = 0; i < layer.pageItems.length; i++) {
            layer.pageItems[i].selected = true;
          }
          return { selectedCount: layer.pageItems.length, layer: "${layerName}" };
        `
        : `
          var doc = app.activeDocument;
          doc.selectObjectsOnActiveArtboard();
          return { selectedCount: doc.selection.length };
        `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Select By Name ============
  server.tool(
    "illustrator_select_by_name",
    "Select objects by name",
    SelectByNameSchema,
    async ({ name }) => {
      const jsx = `
        var doc = app.activeDocument;
        var count = 0;
        for (var i = 0; i < doc.pageItems.length; i++) {
          if (doc.pageItems[i].name === "${name}") {
            doc.pageItems[i].selected = true;
            count++;
          }
        }
        return { selectedCount: count, name: "${name}" };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Deselect All ============
  server.tool(
    "illustrator_deselect_all",
    "Deselect all objects",
    {},
    async () => {
      const jsx = `
        var doc = app.activeDocument;
        doc.selection = null;
        return { deselected: true };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Move Selection ============
  server.tool(
    "illustrator_move_selection",
    "Move selected objects by offset",
    MoveSelectionSchema,
    async ({ deltaX, deltaY }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }
        for (var i = 0; i < sel.length; i++) {
          sel[i].translate(${deltaX}, ${deltaY});
        }
        return { movedCount: sel.length, deltaX: ${deltaX}, deltaY: ${deltaY} };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Scale Selection ============
  server.tool(
    "illustrator_scale_selection",
    "Scale selected objects by percentage",
    ScaleSelectionSchema,
    async ({ scaleX, scaleY }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }
        for (var i = 0; i < sel.length; i++) {
          sel[i].resize(${scaleX}, ${scaleY});
        }
        return { scaledCount: sel.length, scaleX: ${scaleX}, scaleY: ${scaleY} };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Rotate Selection ============
  server.tool(
    "illustrator_rotate_selection",
    "Rotate selected objects by angle",
    RotateSelectionSchema,
    async ({ angle }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }
        for (var i = 0; i < sel.length; i++) {
          sel[i].rotate(${angle});
        }
        return { rotatedCount: sel.length, angle: ${angle} };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Set Fill Color ============
  server.tool(
    "illustrator_set_fill_color",
    "Set fill color of selected objects",
    SetFillColorSchema,
    async ({ color }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }
        var fillColor = new RGBColor();
        fillColor.red = ${color.r};
        fillColor.green = ${color.g};
        fillColor.blue = ${color.b};
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
          var item = sel[i];
          if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
            item.fillColor = fillColor;
            item.filled = true;
            count++;
          } else if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
              item.pathItems[j].fillColor = fillColor;
              item.pathItems[j].filled = true;
              count++;
            }
          }
        }
        return { coloredCount: count, color: { r: ${color.r}, g: ${color.g}, b: ${color.b} } };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Set Stroke Color ============
  server.tool(
    "illustrator_set_stroke_color",
    "Set stroke color and width of selected objects",
    SetStrokeColorSchema,
    async ({ color, width }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }
        var strokeColor = new RGBColor();
        strokeColor.red = ${color.r};
        strokeColor.green = ${color.g};
        strokeColor.blue = ${color.b};
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
          var item = sel[i];
          if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
            item.strokeColor = strokeColor;
            item.stroked = true;
            ${width ? `item.strokeWidth = ${width};` : ""}
            count++;
          } else if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
              item.pathItems[j].strokeColor = strokeColor;
              item.pathItems[j].stroked = true;
              ${width ? `item.pathItems[j].strokeWidth = ${width};` : ""}
              count++;
            }
          }
        }
        return { strokedCount: count, color: { r: ${color.r}, g: ${color.g}, b: ${color.b} }${width ? `, width: ${width}` : ""} };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Group Selection ============
  server.tool(
    "illustrator_group_selection",
    "Group selected objects",
    {},
    async () => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length < 2) {
          throw new Error("Select at least 2 objects to group");
        }
        var group = doc.groupItems.add();
        for (var i = sel.length - 1; i >= 0; i--) {
          sel[i].move(group, ElementPlacement.PLACEATEND);
        }
        group.selected = true;
        return { grouped: true, itemCount: group.pageItems.length };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Ungroup Selection ============
  server.tool(
    "illustrator_ungroup_selection",
    "Ungroup selected groups",
    {},
    async () => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        var ungrouped = 0;
        var released = 0;
        for (var i = sel.length - 1; i >= 0; i--) {
          if (sel[i].typename === "GroupItem") {
            var group = sel[i];
            var parent = group.parent;
            var items = group.pageItems;
            for (var j = items.length - 1; j >= 0; j--) {
              items[j].move(parent, ElementPlacement.PLACEATEND);
              items[j].selected = true;
              released++;
            }
            ungrouped++;
          }
        }
        return { ungroupedGroups: ungrouped, releasedItems: released };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Delete Selection ============
  server.tool(
    "illustrator_delete_selection",
    "Delete selected objects",
    {},
    async () => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }
        var count = sel.length;
        for (var i = sel.length - 1; i >= 0; i--) {
          sel[i].remove();
        }
        return { deletedCount: count };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Duplicate Selection ============
  server.tool(
    "illustrator_duplicate_selection",
    "Duplicate selected objects",
    DuplicateSelectionSchema,
    async ({ offsetX, offsetY }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }
        var duplicates = [];
        for (var i = 0; i < sel.length; i++) {
          var dup = sel[i].duplicate();
          dup.translate(${offsetX || 10}, ${offsetY || -10});
          duplicates.push(dup);
        }
        doc.selection = null;
        for (var j = 0; j < duplicates.length; j++) {
          duplicates[j].selected = true;
        }
        return { duplicatedCount: duplicates.length, offsetX: ${offsetX || 10}, offsetY: ${offsetY || -10} };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Get Selection Info ============
  server.tool(
    "illustrator_get_selection_info",
    "Get information about selected objects",
    {},
    async () => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          return { count: 0, items: [] };
        }
        var items = [];
        for (var i = 0; i < sel.length; i++) {
          var item = sel[i];
          var info = {
            index: i,
            type: item.typename,
            name: item.name || "",
            bounds: {
              left: item.left,
              top: item.top,
              width: item.width,
              height: item.height
            }
          };
          if (item.typename === "PathItem") {
            info.filled = item.filled;
            info.stroked = item.stroked;
            info.closed = item.closed;
            info.pointCount = item.pathPoints.length;
          } else if (item.typename === "TextFrame") {
            info.contents = item.contents.substring(0, 100);
            info.fontSize = item.textRange.characterAttributes.size;
          } else if (item.typename === "GroupItem") {
            info.itemCount = item.pageItems.length;
          }
          items.push(info);
        }
        return { count: items.length, items: items };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Select By Index ============
  server.tool(
    "illustrator_select_by_index",
    "Select an object by its index in the document",
    SelectByIndexSchema,
    async ({ index, addToSelection }) => {
      const jsx = `
        var doc = app.activeDocument;
        if (${index} >= doc.pageItems.length) {
          throw new Error("Index " + ${index} + " out of range. Document has " + doc.pageItems.length + " items.");
        }
        ${!addToSelection ? "doc.selection = null;" : ""}
        doc.pageItems[${index}].selected = true;
        var item = doc.pageItems[${index}];
        return {
          selected: true,
          index: ${index},
          type: item.typename,
          name: item.name || "",
          bounds: { left: item.left, top: item.top, width: item.width, height: item.height }
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Align Selection ============
  server.tool(
    "illustrator_align_selection",
    "Align selected objects horizontally or vertically",
    AlignSelectionSchema,
    async ({ alignment, relativeTo }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
          throw new Error("No objects selected");
        }

        // Calculate bounds
        var bounds;
        if ("${relativeTo}" === "artboard") {
          var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
          var abRect = ab.artboardRect;
          bounds = {
            left: abRect[0],
            top: abRect[1],
            right: abRect[2],
            bottom: abRect[3],
            width: abRect[2] - abRect[0],
            height: abRect[1] - abRect[3]
          };
        } else {
          // Calculate selection bounds
          var minX = Infinity, minY = -Infinity, maxX = -Infinity, maxY = Infinity;
          for (var i = 0; i < sel.length; i++) {
            if (sel[i].left < minX) minX = sel[i].left;
            if (sel[i].top > minY) minY = sel[i].top;
            if (sel[i].left + sel[i].width > maxX) maxX = sel[i].left + sel[i].width;
            if (sel[i].top - sel[i].height < maxY) maxY = sel[i].top - sel[i].height;
          }
          bounds = {
            left: minX,
            top: minY,
            right: maxX,
            bottom: maxY,
            width: maxX - minX,
            height: minY - maxY
          };
        }

        var centerX = bounds.left + bounds.width / 2;
        var centerY = bounds.top - bounds.height / 2;

        for (var i = 0; i < sel.length; i++) {
          var item = sel[i];
          var itemCenterX = item.left + item.width / 2;
          var itemCenterY = item.top - item.height / 2;

          switch ("${alignment}") {
            case "horizontal-left":
              item.left = bounds.left;
              break;
            case "horizontal-center":
              item.left = centerX - item.width / 2;
              break;
            case "horizontal-right":
              item.left = bounds.right - item.width;
              break;
            case "vertical-top":
              item.top = bounds.top;
              break;
            case "vertical-center":
              item.top = centerY + item.height / 2;
              break;
            case "vertical-bottom":
              item.top = bounds.bottom + item.height;
              break;
          }
        }

        return { aligned: sel.length, alignment: "${alignment}", relativeTo: "${relativeTo}" };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Distribute Selection ============
  server.tool(
    "illustrator_distribute_selection",
    "Distribute selected objects evenly",
    DistributeSelectionSchema,
    async ({ direction, spacing }) => {
      const jsx = `
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length < 3) {
          throw new Error("Select at least 3 objects to distribute");
        }

        // Convert to array and sort
        var items = [];
        for (var i = 0; i < sel.length; i++) {
          items.push(sel[i]);
        }

        if ("${direction}" === "horizontal") {
          items.sort(function(a, b) { return a.left - b.left; });

          if ("${spacing}" === "objects") {
            // Distribute by object centers
            var firstCenter = items[0].left + items[0].width / 2;
            var lastCenter = items[items.length - 1].left + items[items.length - 1].width / 2;
            var totalDist = lastCenter - firstCenter;
            var step = totalDist / (items.length - 1);

            for (var i = 1; i < items.length - 1; i++) {
              var targetCenter = firstCenter + step * i;
              items[i].left = targetCenter - items[i].width / 2;
            }
          } else {
            // Distribute with equal spacing
            var totalWidth = 0;
            for (var i = 0; i < items.length; i++) {
              totalWidth += items[i].width;
            }
            var totalSpace = (items[items.length - 1].left + items[items.length - 1].width) - items[0].left;
            var gap = (totalSpace - totalWidth) / (items.length - 1);

            var currentX = items[0].left + items[0].width + gap;
            for (var i = 1; i < items.length - 1; i++) {
              items[i].left = currentX;
              currentX += items[i].width + gap;
            }
          }
        } else {
          items.sort(function(a, b) { return b.top - a.top; }); // Sort top to bottom

          if ("${spacing}" === "objects") {
            var firstCenter = items[0].top - items[0].height / 2;
            var lastCenter = items[items.length - 1].top - items[items.length - 1].height / 2;
            var totalDist = firstCenter - lastCenter;
            var step = totalDist / (items.length - 1);

            for (var i = 1; i < items.length - 1; i++) {
              var targetCenter = firstCenter - step * i;
              items[i].top = targetCenter + items[i].height / 2;
            }
          } else {
            var totalHeight = 0;
            for (var i = 0; i < items.length; i++) {
              totalHeight += items[i].height;
            }
            var totalSpace = items[0].top - (items[items.length - 1].top - items[items.length - 1].height);
            var gap = (totalSpace - totalHeight) / (items.length - 1);

            var currentY = items[0].top - items[0].height - gap;
            for (var i = 1; i < items.length - 1; i++) {
              items[i].top = currentY;
              currentY -= items[i].height + gap;
            }
          }
        }

        return { distributed: items.length, direction: "${direction}", spacing: "${spacing}" };
      `;
      return formatResult(runJsx(jsx));
    }
  );
}
