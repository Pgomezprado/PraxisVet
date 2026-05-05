export function formatCLP(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return `$${n.toLocaleString("es-CL")}`;
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return "--:--";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "justo ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "hace 1 día";
  if (diffDays < 30) return `hace ${diffDays} días`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
  return `hace ${Math.floor(diffDays / 365)} años`;
}

export function minutesUntil(time: string): number {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diff = Math.floor((target.getTime() - now.getTime()) / 60000);
  return diff;
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "ahora";
  if (minutes < 60) return `en ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `en ${h}h` : `en ${h}h ${m}min`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Edad de mascota en lenguaje natural es-CL.
 * Ejemplos: "8 meses", "1 año", "1 año y 3 meses", "4 años".
 * Devuelve null si no hay birthdate.
 */
export function formatPetAge(birthdate: string | null | undefined): string | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate + "T12:00:00");
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0) {
    const totalMonths = Math.max(0, years * 12 + months);
    if (totalMonths === 0) return "recién nacido/a";
    if (totalMonths === 1) return "1 mes";
    return `${totalMonths} meses`;
  }
  const y = years === 1 ? "1 año" : `${years} años`;
  if (months === 0) return y;
  const m = months === 1 ? "1 mes" : `${months} meses`;
  return `${y} y ${m}`;
}
