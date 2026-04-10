import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateES,
  formatDateTimeES,
  invoiceStatusLabel,
  paymentMethodLabel,
  drawHeader,
  drawLabelValue,
  drawFooter,
  checkPageBreak,
} from "@/lib/pdf/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clinic: string; invoiceId: string }> }
) {
  const { clinic, invoiceId } = await params;
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

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      `
      *,
      client:clients!client_id (id, first_name, last_name, phone, email, address)
    `
    )
    .eq("id", invoiceId)
    .eq("org_id", org.id)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at");

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at");

  const client = invoice.client as unknown as {
    id: string; first_name: string; last_name: string;
    phone: string | null; email: string | null; address: string | null;
  };

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawHeader(doc, org, 20);

  // Titulo FACTURA + numero
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("FACTURA", 20, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`No. ${invoice.invoice_number}`, 190, y - 6, { align: "right" });

  doc.setFontSize(9);
  doc.text(`Fecha: ${formatDateES(invoice.created_at.split("T")[0])}`, 190, y, { align: "right" });

  if (invoice.due_date) {
    doc.text(`Vencimiento: ${formatDateES(invoice.due_date)}`, 190, y + 5, { align: "right" });
  }

  y += 12;

  // Estado de la factura
  const statusText = invoiceStatusLabel(invoice.status);
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 139, 34],
    sent: [30, 100, 200],
    draft: [150, 150, 150],
    overdue: [200, 50, 50],
    cancelled: [150, 50, 50],
  };
  const statusColor = statusColors[invoice.status] || [100, 100, 100];

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...statusColor);

  const badgeWidth = doc.getTextWidth(statusText) + 8;
  doc.setDrawColor(...statusColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, y - 4, badgeWidth, 7, 1.5, 1.5, "S");
  doc.text(statusText, 24, y);

  doc.setTextColor(0, 0, 0);
  y += 10;

  // Datos del cliente
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del cliente", 20, y);
  y += 6;

  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(20, y - 3, 170, 22, 2, 2, "FD");
  y += 2;

  drawLabelValue(doc, "Nombre", `${client.first_name} ${client.last_name}`, 25, y);
  drawLabelValue(doc, "Telefono", client.phone || "No registrado", 110, y);
  y += 10;
  if (client.email) {
    drawLabelValue(doc, "Email", client.email, 25, y);
  }
  if (client.address) {
    drawLabelValue(doc, "Direccion", client.address, 110, y, 75);
  }
  y += 14;

  // Tabla de items
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Detalle", 20, y);
  y += 6;

  const tableX = 20;
  const itemColWidths = [80, 25, 30, 35];
  const itemHeaders = ["Descripcion", "Cantidad", "Precio unit.", "Total"];

  doc.setFillColor(240, 240, 240);
  doc.rect(tableX, y - 4, 170, 7, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);

  let hx = tableX + 2;
  itemHeaders.forEach((header, i) => {
    if (i >= 1) {
      doc.text(header, hx + itemColWidths[i] - 4, y, { align: "right" });
    } else {
      doc.text(header, hx, y);
    }
    hx += itemColWidths[i];
  });

  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(tableX, y, tableX + 170, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  if (items && items.length > 0) {
    for (const item of items) {
      y = checkPageBreak(doc, y, 10);

      const descLines = doc.splitTextToSize(item.description, itemColWidths[0] - 4);
      doc.text(descLines, tableX + 2, y);

      const qtyX = tableX + itemColWidths[0] + itemColWidths[1] - 2;
      doc.text(String(item.quantity), qtyX, y, { align: "right" });

      const priceX = qtyX + itemColWidths[2];
      doc.text(formatCurrency(item.unit_price), priceX, y, { align: "right" });

      const totalX = priceX + itemColWidths[3];
      doc.text(formatCurrency(item.total), totalX, y, { align: "right" });

      const rowHeight = descLines.length * 4 + 3;
      y += rowHeight;

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(tableX, y - 1, tableX + 170, y - 1);
      y += 1;
    }
  } else {
    doc.text("Sin items registrados", tableX + 2, y);
    y += 8;
  }

  // Totales
  y += 4;
  y = checkPageBreak(doc, y, 25);

  const totalsX = 130;
  const totalsValX = 188;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(invoice.subtotal), totalsValX, y, { align: "right" });
  y += 5;

  doc.text(`Impuesto (${(invoice.tax_rate * 100).toFixed(0)}%):`, totalsX, y);
  doc.text(formatCurrency(invoice.tax_amount), totalsValX, y, { align: "right" });
  y += 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(totalsX, y, 190, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", totalsX, y);
  doc.text(formatCurrency(invoice.total), totalsValX, y, { align: "right" });
  y += 10;

  // Historial de pagos
  if (payments && payments.length > 0) {
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Historial de pagos", 20, y);
    y += 6;

    const payColWidths = [50, 35, 40, 45];
    const payHeaders = ["Fecha", "Metodo", "Monto", "Referencia"];

    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, y - 4, 170, 7, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);

    let phx = tableX + 2;
    payHeaders.forEach((header, i) => {
      doc.text(header, phx, y);
      phx += payColWidths[i];
    });

    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(tableX, y, tableX + 170, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    for (const payment of payments) {
      y = checkPageBreak(doc, y, 8);

      let px = tableX + 2;
      doc.text(formatDateTimeES(payment.created_at), px, y);
      px += payColWidths[0];
      doc.text(paymentMethodLabel(payment.method), px, y);
      px += payColWidths[1];
      doc.text(formatCurrency(payment.amount), px, y);
      px += payColWidths[2];
      doc.text(payment.reference || "-", px, y);

      y += 6;
    }

    y += 4;
  }

  // Notas
  if (invoice.notes) {
    y = checkPageBreak(doc, y, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Notas", 20, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(invoice.notes, 160);
    doc.text(noteLines, 20, y);
  }

  drawFooter(doc);

  const pdfBuffer = doc.output("arraybuffer");

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="factura-${invoice.invoice_number}.pdf"`,
    },
  });
}
