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
 * Devuelve sugerencias de raza según la especie.
 * Si la especie es desconocida o "other", devuelve una lista vacía y el usuario escribe libremente.
 */
export function getBreedSuggestions(species: string | null | undefined): string[] {
  switch (species) {
    case "dog":
      return DOG_BREEDS;
    case "cat":
      return CAT_BREEDS;
    case "bird":
      return BIRD_BREEDS;
    case "rabbit":
      return RABBIT_BREEDS;
    default:
      return [];
  }
}
