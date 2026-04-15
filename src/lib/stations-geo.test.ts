/**
 * Tests for station registry and geo utilities.
 */
import { describe, it, expect } from "vitest";
import { STATIONS, getStation, getDefaultStation } from "@/lib/stations";
import {
  haversineDistance,
  findNearestStation,
  stationsByDistance,
} from "@/lib/geo";

// ---------------------------------------------------------------------------
// Station registry
// ---------------------------------------------------------------------------

describe("STATIONS registry", () => {
  it("contains all 7 Galician stations", () => {
    expect(STATIONS).toHaveLength(7);
    const ids = STATIONS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "vigo",
        "villagarcia",
        "marin",
        "coruna",
        "ferrol",
        "sancibrao",
        "langosteira",
      ])
    );
  });

  it("every station has required fields", () => {
    for (const s of STATIONS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.shortName).toBeTruthy();
      expect(s.lat).toBeGreaterThan(41);
      expect(s.lat).toBeLessThan(44);
      expect(s.lon).toBeLessThan(-7);
      expect(s.lon).toBeGreaterThan(-10);
      expect(s.tideGaugeId).toBeTruthy();
      expect(s.platformId).toMatch(/^\d+$/);
      expect(s.filePrefix).toBeTruthy();
    }
  });

  it("San Cibrao is the only station without a MOHID model", () => {
    const noMohid = STATIONS.filter((s) => s.mohidModel === null);
    expect(noMohid).toHaveLength(1);
    expect(noMohid[0].id).toBe("sancibrao");
    expect(noMohid[0].mohidGridPoint).toBeNull();
  });

  it("all MOHID stations have grid points", () => {
    const mohidStations = STATIONS.filter((s) => s.mohidModel !== null);
    for (const s of mohidStations) {
      expect(s.mohidGridPoint).not.toBeNull();
      expect(s.mohidGridPoint).toHaveLength(2);
      expect(s.mohidGridPoint![0]).toBeGreaterThanOrEqual(0);
      expect(s.mohidGridPoint![1]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("getStation", () => {
  it("finds a station by id", () => {
    const s = getStation("vigo");
    expect(s).toBeDefined();
    expect(s!.name).toBe("Vigo");
  });

  it("returns undefined for unknown id", () => {
    expect(getStation("atlantis")).toBeUndefined();
  });

  it("is case-sensitive", () => {
    expect(getStation("Vigo")).toBeUndefined();
  });
});

describe("getDefaultStation", () => {
  it("returns Vigo as default", () => {
    const s = getDefaultStation();
    expect(s.id).toBe("vigo");
  });
});

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(42.0, -8.0, 42.0, -8.0)).toBe(0);
  });

  it("computes ~111 km for 1 degree of latitude", () => {
    const d = haversineDistance(42.0, -8.0, 43.0, -8.0);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("computes known distance: Vigo → A Coruña ~120-130 km", () => {
    const vigo = getStation("vigo")!;
    const coruna = getStation("coruna")!;
    const d = haversineDistance(vigo.lat, vigo.lon, coruna.lat, coruna.lon);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(150);
  });

  it("is symmetric", () => {
    const d1 = haversineDistance(42.0, -8.0, 43.0, -9.0);
    const d2 = haversineDistance(43.0, -9.0, 42.0, -8.0);
    expect(d1).toBeCloseTo(d2, 6);
  });
});

// ---------------------------------------------------------------------------
// findNearestStation / stationsByDistance
// ---------------------------------------------------------------------------

describe("findNearestStation", () => {
  it("returns Vigo for coordinates near Vigo", () => {
    const s = findNearestStation(42.24, -8.73);
    expect(s.id).toBe("vigo");
  });

  it("returns A Coruña for coordinates near A Coruña", () => {
    const s = findNearestStation(43.37, -8.40);
    expect(s.id).toBe("coruna");
  });

  it("returns San Cibrao for coordinates in NE Galicia", () => {
    const s = findNearestStation(43.7, -7.5);
    expect(s.id).toBe("sancibrao");
  });
});

describe("stationsByDistance", () => {
  it("returns all stations sorted by distance", () => {
    const ranked = stationsByDistance(42.24, -8.73);
    expect(ranked).toHaveLength(7);

    // First should be Vigo (closest)
    expect(ranked[0].station.id).toBe("vigo");

    // Distances should be ascending
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].distanceKm).toBeGreaterThanOrEqual(
        ranked[i - 1].distanceKm
      );
    }
  });

  it("first entry has distance 0 or near-0 when at station location", () => {
    const vigo = getStation("vigo")!;
    const ranked = stationsByDistance(vigo.lat, vigo.lon);
    expect(ranked[0].station.id).toBe("vigo");
    expect(ranked[0].distanceKm).toBeLessThan(0.01);
  });

  it("distances are always non-negative", () => {
    const ranked = stationsByDistance(42.5, -8.5);
    for (const r of ranked) {
      expect(r.distanceKm).toBeGreaterThanOrEqual(0);
    }
  });
});
