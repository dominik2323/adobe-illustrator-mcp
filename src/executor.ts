import { execSync } from "child_process";

export interface JsxResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Execute JSX script in Illustrator via AppleScript/osascript
 */
export function executeJsx(script: string): JsxResult {
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
      timeout: 60000,
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

/**
 * Wrap JSX script with error handling and JSON return
 */
export function wrapJsx(script: string): string {
  return `
    (function() {
      try {
        var __result__ = (function() {
          ${script}
        })();
        return '{"success":true,"data":' + __jsonStringify__(__result__) + '}';
      } catch (e) {
        return '{"success":false,"error":"' + String(e.message || e).replace(/"/g, '\\\\"').replace(/\\n/g, ' ') + '"}';
      }
    })();
  `;
}

/**
 * JSON.stringify polyfill for ExtendScript (ES3)
 * ExtendScript doesn't have native JSON support
 */
export const jsonStringifyPolyfill = `
function __jsonStringify__(obj) {
  if (obj === null) return 'null';
  if (obj === undefined) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return isFinite(obj) ? String(obj) : 'null';
  if (typeof obj === 'string') return '"' + obj.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\n/g, '\\\\n').replace(/\\r/g, '\\\\r').replace(/\\t/g, '\\\\t') + '"';
  if (obj instanceof Array) {
    var arr = [];
    for (var i = 0; i < obj.length; i++) {
      arr.push(__jsonStringify__(obj[i]));
    }
    return '[' + arr.join(',') + ']';
  }
  if (typeof obj === 'object') {
    var parts = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        parts.push('"' + k + '":' + __jsonStringify__(obj[k]));
      }
    }
    return '{' + parts.join(',') + '}';
  }
  return 'null';
}
`;

/**
 * Execute JSX with automatic wrapping and JSON polyfill
 */
export function runJsx(script: string): JsxResult {
  const fullScript = jsonStringifyPolyfill + wrapJsx(script);
  return executeJsx(fullScript);
}

/**
 * Format tool result for MCP
 */
export function formatResult(result: JsxResult): {
  content: { type: "text"; text: string }[];
  isError?: boolean;
} {
  if (!result.success) {
    return {
      content: [{ type: "text", text: `Error: ${result.error}` }],
      isError: true,
    };
  }

  const jsxResult = result.result as { success: boolean; data?: unknown; error?: string };

  if (!jsxResult.success) {
    return {
      content: [{ type: "text", text: `Illustrator error: ${jsxResult.error}` }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(jsxResult.data, null, 2) }],
  };
}
