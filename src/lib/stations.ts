import type { Station } from "@/lib/tides/types";

/**
 * Static registry of tide gauge stations on the Galician coast.
 *
 * Data sources:
 * - Observations: Puertos del Estado THREDDS (opendap.puertos.es)
 * - Forecasts: MeteoGalicia MOHID/ROMS models (thredds.meteogalicia.gal)
 *
 * File path pattern for observations:
 *   tidegauge_{tideGaugeId}/{year}/{month}/MIR2Z_{filePrefix}_{tideGaugeId}_{platformId}_{YYYYMMDD}.nc4
 */
export const STATIONS: Station[] = [
  {
    id: "vigo",
    name: "Vigo",
    shortName: "Vigo",
    lat: 42.2431,
    lon: -8.7264,
    tideGaugeId: "Vig2",
    platformId: "3221",
    filePrefix: "Vigo",
    mohidModel: "mohid_riasbaixas",
    mohidGridPoint: [68, 192],
  },
  {
    id: "villagarcia",
    name: "Vilagarcia de Arousa",
    shortName: "Vilagarcia",
    lat: 42.6019,
    lon: -8.7708,
    tideGaugeId: "Vil2",
    platformId: "3220",
    filePrefix: "Villagarcia",
    mohidModel: "mohid_riasbaixas",
    mohidGridPoint: [187, 177],
  },
  {
    id: "marin",
    name: "Marin",
    shortName: "Marin",
    lat: 42.3958,
    lon: -8.7042,
    tideGaugeId: "Mari",
    platformId: "3223",
    filePrefix: "Marin",
    mohidModel: "mohid_riasbaixas",
    mohidGridPoint: [119, 199],
  },
  {
    id: "coruna",
    name: "A Coruña",
    shortName: "A Coruña",
    lat: 43.3658,
    lon: -8.3961,
    tideGaugeId: "Cor2",
    platformId: "3219",
    filePrefix: "Coruna",
    mohidModel: "mohid_artabro",
    mohidGridPoint: [19, 81],
  },
  {
    id: "ferrol",
    name: "Ferrol",
    shortName: "Ferrol",
    lat: 43.4647,
    lon: -8.2489,
    tideGaugeId: "Fer4",
    platformId: "3212",
    filePrefix: "Ferrol",
    mohidModel: "mohid_artabro",
    mohidGridPoint: [52, 130],
  },
  {
    id: "sancibrao",
    name: "San Cibrao",
    shortName: "San Cibrao",
    lat: 43.7128,
    lon: -7.4556,
    tideGaugeId: "SCib",
    platformId: "3210",
    filePrefix: "SanCibrao",
    mohidModel: null, // ROMS fallback
    mohidGridPoint: null,
  },
  {
    id: "langosteira",
    name: "Langosteira",
    shortName: "Langosteira",
    lat: 43.3583,
    lon: -8.5106,
    tideGaugeId: "Lan2",
    platformId: "3213",
    filePrefix: "Langosteira2",
    mohidModel: "mohid_portolangosteira",
    mohidGridPoint: [96, 108],
  },
];

/** Find a station by its string id. */
export function getStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

/** Get the default station (Vigo). */
export function getDefaultStation(): Station {
  return STATIONS[0];
}
