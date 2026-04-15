/**
 * Parser for OPeNDAP ASCII responses from THREDDS servers.
 *
 * OPeNDAP ASCII format looks like:
 * ```
 * Dataset {
 *   Float64 TIME[TIME = 172800];
 *   Float32 SLEV[TIME = 172800][DEPTH = 1];
 * } tidegauge_vig2/...;
 * ---
 * TIME[172800]
 * 0.0, 0.5, 1.0, ...
 *
 * SLEV[172800][1]
 * [0], 1.234
 * [1], 1.235
 * ...
 * ```
 */

export interface ParsedVariable {
  name: string;
  dimensions: string[];
  values: number[];
}

export interface ParsedOPeNDAP {
  variables: Record<string, ParsedVariable>;
}

/**
 * Parse an OPeNDAP ASCII response into structured data.
 * Handles both 1D arrays (TIME) and 2D arrays (SLEV[time][depth]).
 */
export function parseOPeNDAPAscii(text: string): ParsedOPeNDAP {
  const result: ParsedOPeNDAP = { variables: {} };

  // Split at the "---" separator between header and data
  const separatorIdx = text.indexOf("\n-----");
  if (separatorIdx === -1) {
    throw new Error("Invalid OPeNDAP ASCII response: no data separator found");
  }

  const dataSection = text.substring(separatorIdx + 1);

  // Split data section into variable blocks
  // Each block starts with "VARNAME[dim]" or "VARNAME[dim1][dim2]"
  const lines = dataSection.split("\n").filter((l) => l.trim().length > 0);

  let currentVar: ParsedVariable | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip separator lines
    if (trimmed.startsWith("---")) continue;

    // Check if this line is a variable header like "TIME[172800]" or "SLEV[172800][1]"
    const headerMatch = trimmed.match(/^(\w+)\[(\d+)\](?:\[(\d+)\])?\s*$/);
    if (headerMatch) {
      // Save previous variable
      if (currentVar) {
        result.variables[currentVar.name] = currentVar;
      }
      currentVar = {
        name: headerMatch[1],
        dimensions: headerMatch[3]
          ? [headerMatch[2], headerMatch[3]]
          : [headerMatch[2]],
        values: [],
      };
      continue;
    }

    // Parse data lines
    if (currentVar) {
      // 1D array: "0.0, 0.5, 1.0, ..."
      // 2D array: "[0], 1.234" or "[0][0], 1.234"
      const indexedMatch = trimmed.match(/^\[\d+\](?:\[\d+\])?,\s*(.+)$/);
      if (indexedMatch) {
        const vals = indexedMatch[1]
          .split(",")
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !isNaN(v));
        currentVar.values.push(...vals);
      } else {
        // Plain comma-separated values
        const vals = trimmed
          .split(",")
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !isNaN(v));
        if (vals.length > 0) {
          currentVar.values.push(...vals);
        }
      }
    }
  }

  // Save last variable
  if (currentVar) {
    result.variables[currentVar.name] = currentVar;
  }

  return result;
}
