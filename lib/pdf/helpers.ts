import jsPDF from "jspdf";

export function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateES(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTimeES(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calculateAge(birthdate: string | null): string {
  if (!birthdate) return "No registrada";
  const birth = new Date(birthdate + "T12:00:00");
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years > 0) {
    const adjustedMonths = months < 0 ? 12 + months : months;
    if (years === 1 && adjustedMonths === 0) return "1 anio";
    if (adjustedMonths > 0) return `${years} anio${years > 1 ? "s" : ""}, ${adjustedMonths} mes${adjustedMonths > 1 ? "es" : ""}`;
    return `${years} anio${years > 1 ? "s" : ""}`;
  }

  const totalMonths = months < 0 ? 12 + months : months;
  if (totalMonths > 0) return `${totalMonths} mes${totalMonths > 1 ? "es" : ""}`;
  return "Menos de 1 mes";
}

const SPECIES_MAP: Record<string, string> = {
  canino: "Canino",
  felino: "Felino",
  exotico: "Exótico",
};

const SEX_MAP: Record<string, string> = {
  male: "Macho",
  female: "Hembra",
};

export function speciesLabel(species: string | null): string {
  return species ? SPECIES_MAP[species] ?? species : "No especificada";
}

export function sexLabel(sex: string | null): string {
  return sex ? SEX_MAP[sex] ?? sex : "No especificado";
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

export function paymentMethodLabel(method: string | null): string {
  return method ? PAYMENT_METHOD_MAP[method] ?? method : "No especificado";
}

const INVOICE_STATUS_MAP: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Cancelada",
};

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_MAP[status] ?? status;
}

export function drawHeader(
  doc: jsPDF,
  org: { name: string; address: string | null; phone: string | null; email: string | null },
  startY: number
): number {
  let y = startY;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(org.name, 20, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  const contactParts: string[] = [];
  if (org.address) contactParts.push(org.address);
  if (org.phone) contactParts.push(`Tel: ${org.phone}`);
  if (org.email) contactParts.push(org.email);

  if (contactParts.length > 0) {
    doc.text(contactParts.join("  |  "), 20, y);
    y += 5;
  }

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 6;

  return y;
}

export function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth?: number
): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  if (maxWidth) {
    const lines = doc.splitTextToSize(value, maxWidth);
    doc.text(lines, x, y + 4);
    return y + 4 + lines.length * 4;
  }

  doc.text(value, x, y + 4);
  return y + 8;
}

export function drawFooter(doc: jsPDF): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - 15;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, y, 190, y);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);

  const printDate = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.text("Generado por PraxisVet", 20, y + 5);
  doc.text(`Fecha de impresion: ${printDate}`, 190, y + 5, { align: "right" });
}

export function checkPageBreak(doc: jsPDF, currentY: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageHeight - 25) {
    doc.addPage();
    drawFooter(doc);
    return 20;
  }
  return currentY;
}
