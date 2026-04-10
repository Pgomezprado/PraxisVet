import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateES,
  calculateAge,
  speciesLabel,
  sexLabel,
  drawHeader,
  drawLabelValue,
  drawFooter,
  checkPageBreak,
} from "@/lib/pdf/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clinic: string; recordId: string }> }
) {
  const { clinic, recordId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, phone, address, email, logo_url")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Clinica no encontrada" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Sin acceso a esta clinica" }, { status: 403 });
  }

  const { data: record } = await supabase
    .from("clinical_records")
    .select(
      `
      *,
      vet:organization_members!vet_id (id, first_name, last_name, specialty),
      pet:pets!pet_id (
        id, name, species, breed, sex, birthdate, client_id,
        client:clients!client_id (id, first_name, last_name, phone, email)
      )
    `
    )
    .eq("id", recordId)
    .eq("org_id", org.id)
    .single();

  if (!record) {
    return NextResponse.json({ error: "Registro clinico no encontrado" }, { status: 404 });
  }

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("clinical_record_id", recordId)
    .eq("org_id", org.id)
    .order("created_at");

  if (!prescriptions || prescriptions.length === 0) {
    return NextResponse.json({ error: "No hay prescripciones para este registro" }, { status: 404 });
  }

  const pet = record.pet as unknown as {
    id: string; name: string; species: string | null;
    breed: string | null; sex: string | null; birthdate: string | null;
    client: { id: string; first_name: string; last_name: string; phone: string | null; email: string | null };
  };
  const vet = record.vet as unknown as {
    id: string; first_name: string | null; last_name: string | null; specialty: string | null;
  };
  const client = pet.client;
  const vetName = [vet.first_name, vet.last_name].filter(Boolean).join(" ") || "Sin asignar";

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawHeader(doc, org, 20);

  // Titulo
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("RECETA MEDICA VETERINARIA", 105, y, { align: "center" });
  y += 10;

  // Cuadro info paciente
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(20, y, 170, 38, 2, 2, "FD");
  y += 6;

  const col1 = 25;
  const col2 = 110;

  drawLabelValue(doc, "Paciente", pet.name, col1, y);
  drawLabelValue(doc, "Propietario", `${client.first_name} ${client.last_name}`, col2, y);
  y += 10;

  const speciesBreed = [speciesLabel(pet.species), pet.breed].filter(Boolean).join(" - ");
  drawLabelValue(doc, "Especie / Raza", speciesBreed || "No especificada", col1, y);
  drawLabelValue(doc, "Telefono propietario", client.phone || "No registrado", col2, y);
  y += 10;

  drawLabelValue(doc, "Sexo", sexLabel(pet.sex), col1, y);
  drawLabelValue(doc, "Edad", calculateAge(pet.birthdate), col2, y);
  y += 14;

  // Info consulta
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Informacion de la consulta", 20, y);
  y += 6;

  drawLabelValue(doc, "Fecha", formatDateES(record.date), col1, y);
  const vetLabel = vet.specialty ? `${vetName} (${vet.specialty})` : vetName;
  drawLabelValue(doc, "Veterinario", vetLabel, col2, y);
  y += 10;

  if (record.reason) {
    y = drawLabelValue(doc, "Motivo de consulta", record.reason, col1, y, 160);
    y += 2;
  }

  if (record.diagnosis) {
    y = drawLabelValue(doc, "Diagnostico", record.diagnosis, col1, y, 160);
    y += 2;
  }

  y += 4;

  // Tabla de prescripciones
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Prescripcion", 20, y);
  y += 6;

  // Header de la tabla
  const tableX = 20;
  const colWidths = [45, 30, 35, 25, 35];
  const headers = ["Medicamento", "Dosis", "Frecuencia", "Duracion", "Instrucciones"];

  doc.setFillColor(240, 240, 240);
  doc.rect(tableX, y - 4, 170, 7, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);

  let headerX = tableX + 2;
  headers.forEach((header, i) => {
    doc.text(header, headerX, y);
    headerX += colWidths[i];
  });

  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(tableX, y, tableX + 170, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  for (const rx of prescriptions) {
    y = checkPageBreak(doc, y, 12);

    let cellX = tableX + 2;
    const cellValues = [
      rx.medication,
      rx.dose || "-",
      rx.frequency || "-",
      rx.duration || "-",
      rx.notes || "-",
    ];

    let maxLines = 1;
    const splitValues = cellValues.map((val, i) => {
      const lines = doc.splitTextToSize(val, colWidths[i] - 4);
      if (lines.length > maxLines) maxLines = lines.length;
      return lines;
    });

    splitValues.forEach((lines, i) => {
      doc.text(lines, cellX, y);
      cellX += colWidths[i];
    });

    const rowHeight = maxLines * 4 + 3;
    y += rowHeight;

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(tableX, y - 1, tableX + 170, y - 1);
    y += 1;
  }

  // Firma del veterinario
  y += 15;
  y = checkPageBreak(doc, y, 25);

  const signX = 120;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(signX, y, 185, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(vetName, (signX + 185) / 2, y, { align: "center" });
  y += 4;

  if (vet.specialty) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(vet.specialty, (signX + 185) / 2, y, { align: "center" });
  }

  drawFooter(doc);

  const pdfBuffer = doc.output("arraybuffer");

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receta-${recordId}.pdf"`,
    },
  });
}
