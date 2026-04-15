/**
 * Static registry of species commonly fished on the Galician coast.
 *
 * Icons use Material Symbols Outlined names. Since there are no
 * species-specific icons, we use contextual icons per category.
 */

import type { Species } from "./types";

export const SPECIES: Species[] = [
  // ── Shellfish (bivalves & gastropods) ─────────────────────────
  {
    id: "almeja-fina",
    name: "Almeja fina",
    scientificName: "Ruditapes decussatus",
    category: "shellfish",
    icon: "filter_vintage",
  },
  {
    id: "almeja-babosa",
    name: "Almeja babosa",
    scientificName: "Venerupis corrugata",
    category: "shellfish",
    icon: "filter_vintage",
  },
  {
    id: "almeja-rubia",
    name: "Almeja rubia",
    scientificName: "Polititapes rhomboides",
    category: "shellfish",
    icon: "filter_vintage",
  },
  {
    id: "berberecho",
    name: "Berberecho",
    scientificName: "Cerastoderma edule",
    category: "shellfish",
    icon: "filter_vintage",
  },
  {
    id: "navaja",
    name: "Navaja / Longueirón",
    scientificName: "Ensis siliqua",
    category: "shellfish",
    icon: "straighten",
  },
  {
    id: "mejillon",
    name: "Mejillón",
    scientificName: "Mytilus galloprovincialis",
    category: "shellfish",
    icon: "water_drop",
  },
  {
    id: "vieira",
    name: "Vieira",
    scientificName: "Pecten maximus",
    category: "shellfish",
    icon: "filter_vintage",
  },
  {
    id: "zamburina",
    name: "Zamburiña",
    scientificName: "Mimachlamys varia",
    category: "shellfish",
    icon: "filter_vintage",
  },

  // ── Crustaceans ───────────────────────────────────────────────
  {
    id: "percebe",
    name: "Percebe",
    scientificName: "Pollicipes pollicipes",
    category: "crustacean",
    icon: "spa",
  },
  {
    id: "centollo",
    name: "Centollo",
    scientificName: "Maja brachydactyla",
    category: "crustacean",
    icon: "set_meal",
  },
  {
    id: "necora",
    name: "Nécora",
    scientificName: "Necora puber",
    category: "crustacean",
    icon: "set_meal",
  },
  {
    id: "bogavante",
    name: "Bogavante",
    scientificName: "Homarus gammarus",
    category: "crustacean",
    icon: "set_meal",
  },
  {
    id: "camaron",
    name: "Camarón",
    scientificName: "Palaemon serratus",
    category: "crustacean",
    icon: "set_meal",
  },

  // ── Finfish ───────────────────────────────────────────────────
  {
    id: "merluza",
    name: "Merluza",
    scientificName: "Merluccius merluccius",
    category: "finfish",
    icon: "phishing",
  },
  {
    id: "sardina",
    name: "Sardina",
    scientificName: "Sardina pilchardus",
    category: "finfish",
    icon: "phishing",
  },
  {
    id: "jurel",
    name: "Jurel",
    scientificName: "Trachurus trachurus",
    category: "finfish",
    icon: "phishing",
  },
  {
    id: "anchoa",
    name: "Anchoa / Bocarte",
    scientificName: "Engraulis encrasicolus",
    category: "finfish",
    icon: "phishing",
  },
  {
    id: "rape",
    name: "Rape",
    scientificName: "Lophius piscatorius",
    category: "finfish",
    icon: "phishing",
  },

  // ── Cephalopods ───────────────────────────────────────────────
  {
    id: "pulpo",
    name: "Pulpo",
    scientificName: "Octopus vulgaris",
    category: "cephalopod",
    icon: "water",
  },
  {
    id: "sepia",
    name: "Sepia / Choco",
    scientificName: "Sepia officinalis",
    category: "cephalopod",
    icon: "water",
  },
];

/** Look up a species by id. */
export function getSpeciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}
