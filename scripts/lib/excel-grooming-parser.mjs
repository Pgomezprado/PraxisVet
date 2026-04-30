/**
 * Parser de fichas individuales de peluquería desde Excel/Google Sheets.
 *
 * Asunción de estructura (basada en foto compartida por Paws&Hairs):
 *   - Una hoja por ficha (= una por mascota), o múltiples bloques en una sola hoja.
 *   - Header con labels: "NOMBRE:", "RAZA:", "SEXO:", "NOMBRE DUEÑO:", "TELEFONO 1:", "TELEFONO 2:".
 *   - El valor de cada label está en la celda inmediatamente a la derecha.
 *   - Tabla histórica con encabezados: "Fecha", "Servicio", "Detalle", "Valor", "Peluquero", "Observaciones".
 *   - Las filas debajo de los encabezados son visitas históricas (hasta primera fila vacía).
 *
 * Si la estructura real difiere, ajustar las constantes LABELS / TABLE_HEADERS y/o el
 * algoritmo findLabelValue / findTableStart.
 *
 * No depende de Supabase. Funciones puras, testeables.
 */

const HEADER_LABELS = {
  pet_name: ["NOMBRE", "NOMBRE MASCOTA", "NOMBRE DEL PACIENTE"],
  breed: ["RAZA"],
  sex: ["SEXO"],
  owner_name: ["NOMBRE DUEÑO", "NOMBRE DUEÑA", "DUEÑO", "TUTOR", "NOMBRE TUTOR"],
  phone1: ["TELEFONO 1", "TELÉFONO 1", "FONO 1", "FONO"],
  phone2: ["TELEFONO 2", "TELÉFONO 2", "FONO 2"],
};

const VISIT_HEADERS = {
  date: ["FECHA"],
  service: ["SERVICIO"],
  detail: ["DETALLE"],
  amount: ["VALOR", "PRECIO", "MONTO"],
  groomer: ["PELUQUERO", "PELUQUERA", "GROOMER"],
  observations: ["OBSERVACIONES", "OBSERVACION", "NOTAS"],
};

const SPECIES_BY_BREED = {
  canino: [
    "poodle", "labrador", "golden", "bulldog", "shih", "yorkshire", "yorky",
    "schnauzer", "beagle", "pastor", "rottweiler", "doberman", "chihuahua",
    "pug", "bóxer", "boxer", "husky", "akita", "border", "collie", "dálmata",
    "dalmata", "cocker", "maltés", "maltes", "westy", "westie", "terrier",
    "fox terrier", "pinscher", "samoyedo", "san bernardo", "gran danés",
    "gran danes", "basset", "salchicha", "dachshund", "weimaraner", "pomerania",
    "pomeranian", "bichon", "bichón", "frise", "lhasa", "afgano", "perro",
    "mestizo canino", "kiltro", "quiltro",
  ],
  felino: [
    "persa", "siames", "siamés", "angora", "ragdoll", "british", "maine coon",
    "sphynx", "esfinge", "bengala", "bengalí", "abisinio", "burmés", "burmes",
    "ragamuffin", "scottish", "exotico shorthair", "exótico shorthair",
    "gato", "felino", "mestizo felino", "doméstico", "domestico",
  ],
  exotico: [
    "conejo", "cobaya", "cuy", "hámster", "hamster", "rata", "ratón", "raton",
    "hurón", "huron", "chinchilla", "loro", "perico", "canario", "agapornis",
    "cacatúa", "cacatua", "ninfa", "tortuga", "iguana", "lagarto", "serpiente",
    "geco", "gecko", "ave", "pájaro", "pajaro", "reptil", "exótico", "exotico",
  ],
};

function normalizeText(value) {
  if (value == null) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function stripLabelSuffix(label) {
  return label.replace(/[:\s]+$/g, "").trim();
}

export function inferSpecies(breed) {
  if (!breed) return "canino";
  const norm = normalizeText(breed);
  for (const [species, breeds] of Object.entries(SPECIES_BY_BREED)) {
    if (breeds.some((b) => norm.includes(normalizeText(b)))) {
      return species;
    }
  }
  return "canino";
}

export function normalizeSex(value) {
  if (!value) return null;
  const v = normalizeText(value);
  if (["m", "macho", "male", "masculino"].some((x) => v === x || v.startsWith(x))) {
    return "male";
  }
  if (["h", "f", "hembra", "female", "femenino", "femenina"].some((x) => v === x || v.startsWith(x))) {
    return "female";
  }
  return null;
}

export function parseCLP(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.round(value);
  const cleaned = String(value).replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Acepta:
 *   - Fechas Excel serial (número días desde 1900-01-01)
 *   - Strings "dd/mm/yyyy", "dd-mm-yyyy", "yyyy-mm-dd"
 *   - Date object
 * Devuelve ISO string "yyyy-mm-dd" o null.
 */
export function parseDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = value * 86400 * 1000;
    const d = new Date(epoch.getTime() + ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = parseInt(yyyy, 10) >= 50 ? `19${yyyy}` : `20${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

export function normalizePhone(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[^\d+]/g, "");
  return cleaned || null;
}

export function splitOwnerName(fullName) {
  if (!fullName) return { first_name: "", last_name: "" };
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  if (parts.length === 2) return { first_name: parts[0], last_name: parts[1] };
  const half = Math.ceil(parts.length / 2);
  return {
    first_name: parts.slice(0, half).join(" "),
    last_name: parts.slice(half).join(" "),
  };
}

/**
 * Convierte una hoja (sheet de xlsx) a matriz 2D.
 * Cada celda es el valor crudo (string/number/Date/null).
 */
export function sheetToMatrix(sheet, XLSX) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: null,
  });
}

/**
 * Busca el valor asociado a un label (ej: "NOMBRE:") en la matriz.
 * El valor está en la celda a la derecha del label, o en la siguiente celda
 * no vacía hacia la derecha si la inmediata está vacía.
 */
function findLabelValue(matrix, candidates) {
  const targets = candidates.map((c) => normalizeText(stripLabelSuffix(c)));
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell == null) continue;
      const norm = normalizeText(stripLabelSuffix(String(cell)));
      if (targets.includes(norm)) {
        for (let k = c + 1; k < row.length && k < c + 6; k++) {
          const v = row[k];
          if (v != null && String(v).trim() !== "") {
            return v;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Encuentra el índice de la fila que contiene los headers de la tabla histórica.
 * Devuelve { rowIndex, colMap } donde colMap mapea cada campo (date, service, ...)
 * a su índice de columna en esa fila. Si no encuentra suficientes headers, devuelve null.
 */
function findTableHeader(matrix) {
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const colMap = {};
    let found = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell == null) continue;
      const norm = normalizeText(String(cell));
      for (const [field, candidates] of Object.entries(VISIT_HEADERS)) {
        if (colMap[field] !== undefined) continue;
        if (candidates.some((cand) => normalizeText(cand) === norm)) {
          colMap[field] = c;
          found++;
          break;
        }
      }
    }
    if (found >= 3 && colMap.date !== undefined) {
      return { rowIndex: r, colMap };
    }
  }
  return null;
}

function isRowEmpty(row) {
  if (!row) return true;
  return row.every((v) => v == null || String(v).trim() === "");
}

/**
 * Parsea una hoja completa como una ficha individual.
 * Devuelve { header, visits } o null si la hoja no parece una ficha.
 */
export function parseFicha(sheet, XLSX) {
  const matrix = sheetToMatrix(sheet, XLSX);
  if (!matrix.length) return null;

  const petName = findLabelValue(matrix, HEADER_LABELS.pet_name);
  if (!petName || !String(petName).trim()) return null;

  const ownerNameRaw = findLabelValue(matrix, HEADER_LABELS.owner_name);
  const owner = splitOwnerName(ownerNameRaw);

  const breed = findLabelValue(matrix, HEADER_LABELS.breed);
  const sexRaw = findLabelValue(matrix, HEADER_LABELS.sex);
  const phone1 = findLabelValue(matrix, HEADER_LABELS.phone1);
  const phone2 = findLabelValue(matrix, HEADER_LABELS.phone2);

  const header = {
    pet_name: String(petName).trim(),
    breed: breed ? String(breed).trim() : null,
    sex: normalizeSex(sexRaw),
    species: inferSpecies(breed),
    owner_first_name: owner.first_name || "Sin nombre",
    owner_last_name: owner.last_name || "",
    phone1: normalizePhone(phone1),
    phone2: normalizePhone(phone2),
  };

  const tableHeader = findTableHeader(matrix);
  const visits = [];
  if (tableHeader) {
    const { rowIndex, colMap } = tableHeader;
    for (let r = rowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      if (isRowEmpty(row)) break;
      const date = parseDate(row[colMap.date]);
      if (!date) continue;
      visits.push({
        date,
        service: colMap.service !== undefined ? (row[colMap.service] ?? null) : null,
        detail: colMap.detail !== undefined ? (row[colMap.detail] ?? null) : null,
        amount: colMap.amount !== undefined ? parseCLP(row[colMap.amount]) : null,
        groomer_name: colMap.groomer !== undefined ? (row[colMap.groomer] ?? null) : null,
        observations: colMap.observations !== undefined ? (row[colMap.observations] ?? null) : null,
      });
    }
  }

  return { header, visits };
}

/**
 * Parsea un workbook completo. Itera todas las hojas e intenta parsear cada una
 * como ficha individual. Devuelve el array de fichas válidas + lista de hojas omitidas.
 */
export function parseWorkbook(workbook, XLSX) {
  const fichas = [];
  const skipped = [];
  for (const sheetName of workbook.SheetNames) {
    try {
      const ficha = parseFicha(workbook.Sheets[sheetName], XLSX);
      if (ficha) {
        fichas.push({ sheet_name: sheetName, ...ficha });
      } else {
        skipped.push({ sheet_name: sheetName, reason: "no se detectó nombre de mascota" });
      }
    } catch (err) {
      skipped.push({ sheet_name: sheetName, reason: err.message });
    }
  }
  return { fichas, skipped };
}
