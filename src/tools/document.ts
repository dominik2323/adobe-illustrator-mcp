import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runJsx, formatResult } from "../executor.js";
import {
  CreateDocumentSchema,
  OpenDocumentSchema,
  SaveDocumentSchema,
  CloseDocumentSchema,
  ExportDocumentSchema,
} from "../types.js";

export function registerDocumentTools(server: McpServer): void {
  // ============ Create Document ============
  server.tool(
    "illustrator_create_document",
    "Create a new Adobe Illustrator document",
    CreateDocumentSchema,
    async ({ width, height, colorMode, name }) => {
      const jsx = `
        var preset = new DocumentPreset();
        preset.width = ${width || 612};
        preset.height = ${height || 792};
        preset.colorMode = DocumentColorSpace.${colorMode || "RGB"};
        ${name ? `preset.title = "${name}";` : ""}
        var doc = app.documents.addDocument("", preset);
        return {
          name: doc.name,
          width: doc.width,
          height: doc.height,
          colorSpace: String(doc.documentColorSpace)
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Open Document ============
  server.tool(
    "illustrator_open_document",
    "Open an existing Illustrator document",
    OpenDocumentSchema,
    async ({ filePath }) => {
      const escapedPath = filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const jsx = `
        var fileRef = new File("${escapedPath}");
        if (!fileRef.exists) {
          throw new Error("File not found: ${escapedPath}");
        }
        var doc = app.open(fileRef);
        return {
          name: doc.name,
          path: doc.fullName.fsName,
          width: doc.width,
          height: doc.height,
          colorSpace: String(doc.documentColorSpace)
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Save Document ============
  server.tool(
    "illustrator_save_document",
    "Save the active Illustrator document",
    SaveDocumentSchema,
    async ({ filePath }) => {
      const jsx = filePath
        ? `
          var doc = app.activeDocument;
          var saveFile = new File("${filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}");
          var saveOptions = new IllustratorSaveOptions();
          doc.saveAs(saveFile, saveOptions);
          return { saved: true, path: saveFile.fsName };
        `
        : `
          var doc = app.activeDocument;
          doc.save();
          return { saved: true, path: doc.fullName ? doc.fullName.fsName : null };
        `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Close Document ============
  server.tool(
    "illustrator_close_document",
    "Close the active Illustrator document",
    CloseDocumentSchema,
    async ({ save }) => {
      const saveOption = save ? "SaveOptions.SAVECHANGES" : "SaveOptions.DONOTSAVECHANGES";
      const jsx = `
        var doc = app.activeDocument;
        var name = doc.name;
        doc.close(${saveOption});
        return { closed: true, name: name };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Export Document ============
  server.tool(
    "illustrator_export_document",
    "Export the active document to PNG, JPG, SVG, or PDF",
    ExportDocumentSchema,
    async ({ filePath, format, quality, scale }) => {
      const escapedPath = filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

      let exportCode: string;
      switch (format) {
        case "png":
          exportCode = `
            var exportOptions = new ExportOptionsPNG24();
            exportOptions.transparency = true;
            exportOptions.artBoardClipping = true;
            ${scale ? `exportOptions.horizontalScale = ${scale * 100}; exportOptions.verticalScale = ${scale * 100};` : ""}
            doc.exportFile(exportFile, ExportType.PNG24, exportOptions);
          `;
          break;
        case "jpg":
          exportCode = `
            var exportOptions = new ExportOptionsJPEG();
            exportOptions.qualitySetting = ${quality || 80};
            exportOptions.artBoardClipping = true;
            ${scale ? `exportOptions.horizontalScale = ${scale * 100}; exportOptions.verticalScale = ${scale * 100};` : ""}
            doc.exportFile(exportFile, ExportType.JPEG, exportOptions);
          `;
          break;
        case "svg":
          exportCode = `
            var exportOptions = new ExportOptionsSVG();
            exportOptions.embedRasterImages = true;
            doc.exportFile(exportFile, ExportType.SVG, exportOptions);
          `;
          break;
        case "pdf":
          exportCode = `
            var saveOptions = new PDFSaveOptions();
            saveOptions.compatibility = PDFCompatibility.ACROBAT7;
            saveOptions.preserveEditability = false;
            doc.saveAs(exportFile, saveOptions);
          `;
          break;
      }

      const jsx = `
        var doc = app.activeDocument;
        var exportFile = new File("${escapedPath}");
        ${exportCode}
        return { exported: true, path: "${escapedPath}", format: "${format}" };
      `;
      return formatResult(runJsx(jsx));
    }
  );

  // ============ Get Document Info ============
  server.tool(
    "illustrator_get_document_info",
    "Get information about the active document",
    {},
    async () => {
      const jsx = `
        var doc = app.activeDocument;
        var layers = [];
        for (var i = 0; i < doc.layers.length; i++) {
          layers.push({
            name: doc.layers[i].name,
            visible: doc.layers[i].visible,
            locked: doc.layers[i].locked,
            itemCount: doc.layers[i].pageItems.length
          });
        }
        var artboards = [];
        for (var j = 0; j < doc.artboards.length; j++) {
          var ab = doc.artboards[j];
          var rect = ab.artboardRect;
          artboards.push({
            name: ab.name,
            left: rect[0],
            top: rect[1],
            right: rect[2],
            bottom: rect[3],
            width: rect[2] - rect[0],
            height: rect[1] - rect[3]
          });
        }
        return {
          name: doc.name,
          path: doc.fullName ? doc.fullName.fsName : null,
          saved: doc.saved,
          width: doc.width,
          height: doc.height,
          colorSpace: String(doc.documentColorSpace),
          rulerUnits: String(doc.rulerUnits),
          layers: layers,
          artboards: artboards,
          pageItemCount: doc.pageItems.length,
          selectionCount: doc.selection ? doc.selection.length : 0
        };
      `;
      return formatResult(runJsx(jsx));
    }
  );
}
