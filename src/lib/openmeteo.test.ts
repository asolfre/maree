/**
 * Tests for Open-Meteo helper functions.
 */
import { describe, it, expect } from "vitest";
import { windDirectionLabel, visibilityLabel } from "@/lib/openmeteo";

// ---------------------------------------------------------------------------
// windDirectionLabel
// ---------------------------------------------------------------------------

describe("windDirectionLabel", () => {
  it("returns Norte for 0°", () => {
    expect(windDirectionLabel(0)).toBe("Norte");
  });

  it("returns Norte for 360° (wraps around)", () => {
    expect(windDirectionLabel(360)).toBe("Norte");
  });

  it("returns Este for 90°", () => {
    expect(windDirectionLabel(90)).toBe("Este");
  });

  it("returns Sur for 180°", () => {
    expect(windDirectionLabel(180)).toBe("Sur");
  });

  it("returns Oeste for 270°", () => {
    expect(windDirectionLabel(270)).toBe("Oeste");
  });

  it("returns Noreste for 45°", () => {
    expect(windDirectionLabel(45)).toBe("Noreste");
  });

  it("returns Sureste for 135°", () => {
    expect(windDirectionLabel(135)).toBe("Sureste");
  });

  it("returns Suroeste for 225°", () => {
    expect(windDirectionLabel(225)).toBe("Suroeste");
  });

  it("returns Noroeste for 315°", () => {
    expect(windDirectionLabel(315)).toBe("Noroeste");
  });

  it("rounds to nearest direction for intermediate values", () => {
    // 20° is closer to Norte (0°) than Noreste (45°)
    expect(windDirectionLabel(20)).toBe("Norte");
    // 30° rounds to Noreste (45° bucket)
    expect(windDirectionLabel(30)).toBe("Noreste");
  });

  it("handles values near sector boundaries", () => {
    // 22° is the boundary — Math.round(22/45) = Math.round(0.49) = 0 → Norte
    expect(windDirectionLabel(22)).toBe("Norte");
    // 23° — Math.round(23/45) = Math.round(0.51) = 1 → Noreste
    expect(windDirectionLabel(23)).toBe("Noreste");
  });

  it("handles negative degrees", () => {
    // -90° should normalize to 270° → Oeste
    expect(windDirectionLabel(-90)).toBe("Oeste");
    // -180° should normalize to 180° → Sur
    expect(windDirectionLabel(-180)).toBe("Sur");
    // -45° should normalize to 315° → Noroeste
    expect(windDirectionLabel(-45)).toBe("Noroeste");
    // -1° should normalize to 359° → Norte
    expect(windDirectionLabel(-1)).toBe("Norte");
  });

  it("handles large positive values (> 360°)", () => {
    // 720° = 2 full rotations → 0° → Norte
    expect(windDirectionLabel(720)).toBe("Norte");
    // 450° = 360 + 90 → Este
    expect(windDirectionLabel(450)).toBe("Este");
    // 810° = 2×360 + 90 → Este
    expect(windDirectionLabel(810)).toBe("Este");
  });

  it("handles large negative values", () => {
    // -360° → 0° → Norte
    expect(windDirectionLabel(-360)).toBe("Norte");
    // -450° → -90° → 270° → Oeste
    expect(windDirectionLabel(-450)).toBe("Oeste");
  });
});

// ---------------------------------------------------------------------------
// visibilityLabel
// ---------------------------------------------------------------------------

describe("visibilityLabel", () => {
  it("returns Excelente for >= 10000m", () => {
    expect(visibilityLabel(10000)).toBe("Excelente");
    expect(visibilityLabel(20000)).toBe("Excelente");
    expect(visibilityLabel(50000)).toBe("Excelente");
  });

  it("returns Buena for >= 5000m and < 10000m", () => {
    expect(visibilityLabel(5000)).toBe("Buena");
    expect(visibilityLabel(7500)).toBe("Buena");
    expect(visibilityLabel(9999)).toBe("Buena");
  });

  it("returns Moderada for >= 2000m and < 5000m", () => {
    expect(visibilityLabel(2000)).toBe("Moderada");
    expect(visibilityLabel(3500)).toBe("Moderada");
    expect(visibilityLabel(4999)).toBe("Moderada");
  });

  it("returns Reducida for >= 1000m and < 2000m", () => {
    expect(visibilityLabel(1000)).toBe("Reducida");
    expect(visibilityLabel(1500)).toBe("Reducida");
    expect(visibilityLabel(1999)).toBe("Reducida");
  });

  it("returns Muy reducida for < 1000m", () => {
    expect(visibilityLabel(999)).toBe("Muy reducida");
    expect(visibilityLabel(500)).toBe("Muy reducida");
    expect(visibilityLabel(0)).toBe("Muy reducida");
  });

  it("handles exact boundary values correctly", () => {
    expect(visibilityLabel(10000)).toBe("Excelente");
    expect(visibilityLabel(9999)).toBe("Buena");
    expect(visibilityLabel(5000)).toBe("Buena");
    expect(visibilityLabel(4999)).toBe("Moderada");
    expect(visibilityLabel(2000)).toBe("Moderada");
    expect(visibilityLabel(1999)).toBe("Reducida");
    expect(visibilityLabel(1000)).toBe("Reducida");
    expect(visibilityLabel(999)).toBe("Muy reducida");
  });
});
