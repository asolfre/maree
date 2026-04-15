/**
 * Tests for OPeNDAP ASCII parser.
 */
import { describe, it, expect } from "vitest";
import {
  parseOPeNDAPAscii,
  type ParsedOPeNDAP,
} from "@/lib/thredds/parser";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal OPeNDAP ASCII response mimicking Puertos del Estado SLEV data. */
const PUERTOS_RESPONSE = `Dataset {
  Float64 TIME[TIME = 4];
  Float32 SLEV[TIME = 4][DEPTH = 1];
} tidegauge_vig2/file.nc4;
---------------------------------------------
TIME[4]
27393.0, 27393.00625, 27393.0125, 27393.01875

SLEV[4][1]
[0], 5.123
[1], 5.456
[2], 5.789
[3], 6.012
`;

/** Response with 2D indexed values like [row][col], value. */
const TWO_D_INDEXED_RESPONSE = `Dataset {
  Float32 SLEV[TIME = 2][DEPTH = 2];
} test;
---------------------------------------------
SLEV[2][2]
[0][0], 1.1
[0][1], 1.2
[1][0], 2.1
[1][1], 2.2
`;

/** Response with comma-separated values on a single line (1D). */
const FLAT_1D_RESPONSE = `Dataset {
  Float64 TIME[TIME = 5];
} test;
---------------------------------------------
TIME[5]
10.0, 20.0, 30.0, 40.0, 50.0
`;

// ---------------------------------------------------------------------------
// parseOPeNDAPAscii
// ---------------------------------------------------------------------------

describe("parseOPeNDAPAscii", () => {
  it("parses a Puertos-style response with TIME and SLEV", () => {
    const result = parseOPeNDAPAscii(PUERTOS_RESPONSE);

    // Should have two variables
    expect(Object.keys(result.variables)).toEqual(
      expect.arrayContaining(["TIME", "SLEV"])
    );

    // TIME: 4 comma-separated values
    expect(result.variables.TIME.values).toHaveLength(4);
    expect(result.variables.TIME.values[0]).toBeCloseTo(27393.0, 6);
    expect(result.variables.TIME.values[3]).toBeCloseTo(27393.01875, 6);
    expect(result.variables.TIME.dimensions).toEqual(["4"]);

    // SLEV: 4 indexed rows
    expect(result.variables.SLEV.values).toHaveLength(4);
    expect(result.variables.SLEV.values[0]).toBeCloseTo(5.123, 3);
    expect(result.variables.SLEV.values[3]).toBeCloseTo(6.012, 3);
    expect(result.variables.SLEV.dimensions).toEqual(["4", "1"]);
  });

  it("parses 2D indexed data ([row][col], value)", () => {
    const result = parseOPeNDAPAscii(TWO_D_INDEXED_RESPONSE);
    const slev = result.variables.SLEV;
    expect(slev).toBeDefined();
    expect(slev.values).toEqual([1.1, 1.2, 2.1, 2.2]);
    expect(slev.dimensions).toEqual(["2", "2"]);
  });

  it("parses flat comma-separated 1D data", () => {
    const result = parseOPeNDAPAscii(FLAT_1D_RESPONSE);
    expect(result.variables.TIME.values).toEqual([10, 20, 30, 40, 50]);
  });

  it("throws on response without data separator", () => {
    expect(() => parseOPeNDAPAscii("no separator here")).toThrow(
      /no data separator found/
    );
  });

  it("returns empty variables when data section has no recognizable blocks", () => {
    const result = parseOPeNDAPAscii("header\n-----\n\n");
    expect(Object.keys(result.variables)).toHaveLength(0);
  });

  it("does not lose the integer part of values with indexed format", () => {
    // Regression test: previously the regex `[\d\][\s,]` ate the integer part
    const response = `Dataset {
  Float32 SLEV[TIME = 1][DEPTH = 1];
} test;
---------------------------------------------
SLEV[1][1]
[0], 6.349
`;
    const result = parseOPeNDAPAscii(response);
    expect(result.variables.SLEV.values[0]).toBeCloseTo(6.349, 3);
  });

  it("correctly parses negative values", () => {
    const response = `Dataset {
  Float32 V[T = 2][D = 1];
} test;
---------------------------------------------
V[2][1]
[0], -3.5
[1], -0.001
`;
    const result = parseOPeNDAPAscii(response);
    expect(result.variables.V.values).toEqual([-3.5, -0.001]);
  });
});
