/**
 * Microcopy cálido para el portal tutor.
 * Frase determinista en función de pet.id (no cambia entre renders),
 * con opción de variantes según género.
 */

const NEUTRAL_PHRASES = [
  "Tu eterno acompañante",
  "Tu engreído/a del día",
  "Tu fiel sombra",
  "Tu compañero/a inseparable",
  "Tu mejor escucha",
  "Tu peludo/a favorito/a",
];

const MALE_PHRASES = [
  "Tu eterno acompañante",
  "Tu engreído del día",
  "Tu fiel compañero",
  "Tu mejor amigo de cuatro patas",
  "Tu sombra favorita",
];

const FEMALE_PHRASES = [
  "Tu eterna acompañante",
  "Tu engreída del día",
  "Tu fiel compañera",
  "Tu mejor amiga de cuatro patas",
  "Tu sombra favorita",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getPetMicrocopy(
  petId: string,
  sex?: string | null
): string {
  const list =
    sex === "male"
      ? MALE_PHRASES
      : sex === "female"
        ? FEMALE_PHRASES
        : NEUTRAL_PHRASES;
  const idx = hashString(petId) % list.length;
  return list[idx];
}

/**
 * Frase con edad incluida (cuando hay birthdate).
 * Determinista por petId. Mezcla microcopy con N años.
 */
export function getPetAgeMicrocopy(
  petId: string,
  ageLabel: string,
  sex?: string | null
): string {
  const isMale = sex === "male";
  const isFemale = sex === "female";
  const variants = isMale
    ? [
        `Hace ${ageLabel} contigo`,
        `Tu compañero de ${ageLabel}`,
        `${ageLabel} a tu lado`,
      ]
    : isFemale
      ? [
          `Hace ${ageLabel} contigo`,
          `Tu compañera de ${ageLabel}`,
          `${ageLabel} a tu lado`,
        ]
      : [
          `Hace ${ageLabel} contigo`,
          `Tu compañero/a de ${ageLabel}`,
          `${ageLabel} a tu lado`,
        ];
  const idx = hashString(petId) % variants.length;
  return variants[idx];
}
