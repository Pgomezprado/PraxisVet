/**
 * Listas de razas por especie, orientadas al mercado chileno.
 * "Mestizo" aparece primero por ser el caso más frecuente en clínicas veterinarias.
 * Las listas no son exhaustivas — el input también permite escribir razas fuera de la lista.
 */

export const DOG_BREEDS = [
  "Mestizo",
  "Labrador Retriever",
  "Golden Retriever",
  "Poodle",
  "Cocker Spaniel",
  "Schnauzer",
  "Beagle",
  "Bulldog Francés",
  "Bulldog Inglés",
  "Pastor Alemán",
  "Pastor Belga",
  "Pastor Australiano",
  "Border Collie",
  "Husky Siberiano",
  "Rottweiler",
  "Dálmata",
  "Pitbull",
  "Yorkshire Terrier",
  "Maltés",
  "Chihuahua",
  "Shih Tzu",
  "Jack Russell Terrier",
  "Bóxer",
  "San Bernardo",
  "Akita",
  "Dachshund",
  "Fox Terrier",
  "Bichón Frisé",
  "Pug",
  "Doberman",
  "Dogo Argentino",
  "Weimaraner",
  "Galgo",
  "Pomerania",
];

export const CAT_BREEDS = [
  "Mestizo",
  "Siamés",
  "Persa",
  "Angora",
  "Maine Coon",
  "Ragdoll",
  "Británico de pelo corto",
  "Bengala",
  "Esfinge",
  "Azul Ruso",
  "Himalayo",
  "Manx",
  "Birmano",
  "Abisinio",
  "Exotic Shorthair",
  "Scottish Fold",
  "Oriental",
];

export const BIRD_BREEDS = [
  "Canario",
  "Periquito",
  "Agapornis",
  "Cacatúa",
  "Loro",
  "Ninfa",
];

export const RABBIT_BREEDS = [
  "Mestizo",
  "Holandés enano",
  "Belier",
  "Cabeza de león",
  "Angora",
  "Rex",
];

/**
 * Devuelve sugerencias de raza según la especie clínica.
 * Para "exotico" no se sugieren razas porque agrupa muchos taxones distintos
 * (aves, conejos, reptiles, etc.) y el usuario escribe libremente. Pendiente
 * subdividir cuando se valide con la clínica.
 */
export function getBreedSuggestions(species: string | null | undefined): string[] {
  switch (species) {
    case "canino":
      return DOG_BREEDS;
    case "felino":
      return CAT_BREEDS;
    default:
      return [];
  }
}

function normalizeBreed(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Combina la lista base con las razas personalizadas de la clínica.
 * Deduplica por nombre normalizado (sin tildes, lower) y mantiene la primera
 * ocurrencia. Para "exotico" muestra solo las custom porque la base está vacía.
 */
export function mergeBreedSuggestions(
  species: string | null | undefined,
  customByspecies: Record<string, string[]> | null | undefined
): string[] {
  const base = getBreedSuggestions(species);
  const custom =
    species && customByspecies ? customByspecies[species] ?? [] : [];

  if (custom.length === 0) return base;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of [...base, ...custom]) {
    const key = normalizeBreed(name);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}
