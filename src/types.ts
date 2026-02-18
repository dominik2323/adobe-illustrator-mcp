import { z } from "zod";

// ============ Common Schemas ============

export const RGBColorSchema = z
  .object({
    r: z.number().min(0).max(255).describe("Red component (0-255)"),
    g: z.number().min(0).max(255).describe("Green component (0-255)"),
    b: z.number().min(0).max(255).describe("Blue component (0-255)"),
  })
  .describe("RGB color");

export const PointSchema = z.object({
  x: z.number().describe("X coordinate in points"),
  y: z.number().describe("Y coordinate in points"),
});

export const PathPointSchema = z.object({
  anchor: PointSchema.describe("Anchor point"),
  leftDirection: PointSchema.optional().describe("Left direction handle"),
  rightDirection: PointSchema.optional().describe("Right direction handle"),
  pointType: z.enum(["corner", "smooth"]).optional().describe("Point type"),
});

// ============ Document Tool Schemas ============

export const CreateDocumentSchema = {
  width: z.number().positive().optional().default(612).describe("Width in points (default: 612 = 8.5 inches)"),
  height: z.number().positive().optional().default(792).describe("Height in points (default: 792 = 11 inches)"),
  colorMode: z.enum(["RGB", "CMYK"]).optional().default("RGB").describe("Document color mode"),
  name: z.string().optional().describe("Document name"),
};

export const OpenDocumentSchema = {
  filePath: z.string().describe("Absolute path to the Illustrator file"),
};

export const SaveDocumentSchema = {
  filePath: z.string().optional().describe("Path to save (optional for existing files)"),
};

export const CloseDocumentSchema = {
  save: z.boolean().optional().default(false).describe("Save before closing"),
};

export const ExportDocumentSchema = {
  filePath: z.string().describe("Export file path"),
  format: z.enum(["png", "jpg", "svg", "pdf"]).describe("Export format"),
  quality: z.number().min(0).max(100).optional().describe("JPEG quality (0-100)"),
  scale: z.number().positive().optional().describe("Export scale (1 = 100%)"),
};

// ============ Shape Tool Schemas ============

export const CreateRectangleSchema = {
  x: z.number().describe("X position (left edge) in points"),
  y: z.number().describe("Y position (top edge) in points"),
  width: z.number().positive().describe("Width in points"),
  height: z.number().positive().describe("Height in points"),
  fillColor: RGBColorSchema.optional().describe("Fill color"),
  strokeColor: RGBColorSchema.optional().describe("Stroke color"),
  strokeWidth: z.number().positive().optional().describe("Stroke width in points"),
};

export const CreateEllipseSchema = {
  x: z.number().describe("X position (left edge) in points"),
  y: z.number().describe("Y position (top edge) in points"),
  width: z.number().positive().describe("Width in points"),
  height: z.number().positive().describe("Height in points"),
  fillColor: RGBColorSchema.optional().describe("Fill color"),
  strokeColor: RGBColorSchema.optional().describe("Stroke color"),
  strokeWidth: z.number().positive().optional().describe("Stroke width in points"),
};

export const CreatePolygonSchema = {
  centerX: z.number().describe("Center X position"),
  centerY: z.number().describe("Center Y position"),
  radius: z.number().positive().describe("Radius in points"),
  sides: z.number().int().min(3).max(100).describe("Number of sides"),
  fillColor: RGBColorSchema.optional().describe("Fill color"),
  strokeColor: RGBColorSchema.optional().describe("Stroke color"),
};

export const CreateStarSchema = {
  centerX: z.number().describe("Center X position"),
  centerY: z.number().describe("Center Y position"),
  outerRadius: z.number().positive().describe("Outer radius in points"),
  innerRadius: z.number().positive().describe("Inner radius in points"),
  points: z.number().int().min(3).max(100).describe("Number of points"),
  fillColor: RGBColorSchema.optional().describe("Fill color"),
  strokeColor: RGBColorSchema.optional().describe("Stroke color"),
};

export const CreateLineSchema = {
  startX: z.number().describe("Start X position"),
  startY: z.number().describe("Start Y position"),
  endX: z.number().describe("End X position"),
  endY: z.number().describe("End Y position"),
  strokeColor: RGBColorSchema.optional().describe("Stroke color"),
  strokeWidth: z.number().positive().optional().default(1).describe("Stroke width in points"),
};

export const CreatePathSchema = {
  points: z.array(PointSchema).min(2).describe("Array of points"),
  closed: z.boolean().optional().default(false).describe("Close the path"),
  fillColor: RGBColorSchema.optional().describe("Fill color (if closed)"),
  strokeColor: RGBColorSchema.optional().describe("Stroke color"),
  strokeWidth: z.number().positive().optional().describe("Stroke width in points"),
};

export const CreateTextSchema = {
  content: z.string().describe("Text content"),
  x: z.number().describe("X position"),
  y: z.number().describe("Y position"),
  fontSize: z.number().positive().optional().default(12).describe("Font size in points"),
  fontName: z.string().optional().describe("Font name"),
  fillColor: RGBColorSchema.optional().describe("Text color"),
};

export const CreateCircleSchema = {
  centerX: z.number().describe("X coordinate of circle center in points"),
  centerY: z.number().describe("Y coordinate of circle center in points"),
  radius: z.number().positive().describe("Radius of the circle in points"),
  fillColor: RGBColorSchema.optional().describe("Fill color"),
  strokeColor: RGBColorSchema.optional().describe("Stroke color"),
  strokeWidth: z.number().positive().optional().describe("Stroke width in points"),
};

// ============ Object Tool Schemas ============

export const SelectAllSchema = {
  layerName: z.string().optional().describe("Optional layer name to select from"),
};

export const SelectByNameSchema = {
  name: z.string().describe("Object name to select"),
};

export const MoveSelectionSchema = {
  deltaX: z.number().describe("Horizontal offset in points"),
  deltaY: z.number().describe("Vertical offset in points"),
};

export const ScaleSelectionSchema = {
  scaleX: z.number().positive().describe("Horizontal scale percentage (100 = no change)"),
  scaleY: z.number().positive().describe("Vertical scale percentage (100 = no change)"),
};

export const RotateSelectionSchema = {
  angle: z.number().describe("Rotation angle in degrees (positive = counter-clockwise)"),
};

export const SetFillColorSchema = {
  color: RGBColorSchema.describe("Fill color"),
};

export const SetStrokeColorSchema = {
  color: RGBColorSchema.describe("Stroke color"),
  width: z.number().positive().optional().describe("Stroke width in points"),
};

export const DuplicateSelectionSchema = {
  offsetX: z.number().optional().default(10).describe("Horizontal offset for duplicate"),
  offsetY: z.number().optional().default(-10).describe("Vertical offset for duplicate"),
};

export const SelectByIndexSchema = {
  index: z.number().int().min(0).describe("Index of the item to select (0-based)"),
  addToSelection: z.boolean().optional().default(false).describe("Add to existing selection instead of replacing"),
};

export const AlignSelectionSchema = {
  alignment: z.enum([
    "horizontal-left",
    "horizontal-center",
    "horizontal-right",
    "vertical-top",
    "vertical-center",
    "vertical-bottom",
  ]).describe("Alignment type"),
  relativeTo: z.enum(["selection", "artboard"]).optional().default("selection").describe("Align relative to selection bounds or artboard"),
};

export const DistributeSelectionSchema = {
  direction: z.enum(["horizontal", "vertical"]).describe("Distribution direction"),
  spacing: z.enum(["objects", "spacing"]).optional().default("objects").describe("Distribute object centers or equal spacing"),
};

// ============ Type Exports ============

export type RGBColor = z.infer<typeof RGBColorSchema>;
export type Point = z.infer<typeof PointSchema>;
