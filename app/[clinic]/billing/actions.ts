"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  invoiceSchema,
  invoiceUpdateSchema,
  invoiceItemSchema,
  paymentSchema,
  type InvoiceInput,
  type InvoiceUpdateInput,
  type InvoiceItemInput,
  type PaymentInput,
} from "@/lib/validations/billing";
import type { InvoiceStatus } from "@/types";
import { escapePostgrestSearch, normalizeSearchTerm } from "@/lib/utils/search";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["overdue", "cancelled"],
  overdue: ["cancelled"],
  partial_paid: ["cancelled"],
  paid: [],
  cancelled: ["draft"],
};

async function getInvoiceInOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
  orgId: string
): Promise<
  | {
      ok: true;
      invoice: {
        id: string;
        status: InvoiceStatus;
        total: number;
        amount_paid: number;
      };
    }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, status, total, amount_paid")
    .eq("id", invoiceId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Factura no pertenece a esta clinica" };
  return {
    ok: true,
    invoice: {
      id: data.id as string,
      status: data.status as InvoiceStatus,
      total: Number(data.total),
      amount_paid: Number(data.amount_paid ?? 0),
    },
  };
}

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export type InvoiceWithClient = {
  id: string;
  org_id: string;
  client_id: string;
  appointment_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  client: { id: string; first_name: string; last_name: string; phone: string | null };
};

export type InvoiceDetail = InvoiceWithClient & {
  items: {
    id: string;
    invoice_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    item_type: "service" | "product" | null;
    created_at: string;
  }[];
  payments: {
    id: string;
    amount: number;
    method: string | null;
    reference: string | null;
    notes: string | null;
    created_at: string;
  }[];
  appointment: {
    id: string;
    date: string;
    start_time: string;
    service: { id: string; name: string; price: number | null } | null;
  } | null;
};

export async function getInvoices(
  orgId: string,
  filters?: {
    status?: InvoiceStatus;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
    search?: string;
  }
): Promise<ActionResult<{ data: InvoiceWithClient[]; total: number }>> {
  try {
    const { supabase } = await getAuthUser();

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;
    const search = filters?.search?.trim() ?? "";
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from("invoices")
      .select(
        `
        *,
        client:clients!client_id (id, first_name, last_name, phone)
      `,
        { count: "exact", head: false }
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.from) {
      query = query.gte("created_at", filters.from);
    }
    if (filters?.to) {
      query = query.lte("created_at", filters.to + "T23:59:59");
    }
    if (search) {
      const safe = escapePostgrestSearch(search);
      if (safe) {
        const safeNorm = normalizeSearchTerm(safe);
        const { data: matchingClients } = await supabase
          .from("clients")
          .select("id")
          .eq("org_id", orgId)
          .or(
            `first_name_search.ilike.%${safeNorm}%,last_name_search.ilike.%${safeNorm}%`
          );

        const clientIds = (matchingClients ?? []).map((c) => c.id);

        if (clientIds.length > 0) {
          query = query.or(
            `invoice_number.ilike.%${safe}%,client_id.in.(${clientIds.join(",")})`
          );
        } else {
          query = query.ilike("invoice_number", `%${safe}%`);
        }
      }
    }

    query = query.range(rangeFrom, rangeTo);

    const { data, error, count } = await query;

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: {
        data: data as unknown as InvoiceWithClient[],
        total: count ?? 0,
      },
    };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function getInvoice(
  invoiceId: string
): Promise<ActionResult<InvoiceDetail>> {
  try {
    const { supabase } = await getAuthUser();

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        *,
        client:clients!client_id (id, first_name, last_name, phone),
        items:invoice_items (*),
        payments:payments (*),
        appointment:appointments!appointment_id (
          id, date, start_time,
          service:services!service_id (id, name, price)
        )
      `
      )
      .eq("id", invoiceId)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as unknown as InvoiceDetail };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function getNextInvoiceNumber(
  orgId: string
): Promise<ActionResult<string>> {
  try {
    const { supabase } = await getAuthUser();

    const { data } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.invoice_number) {
      const match = data.invoice_number.match(/INV-(\d+)/);
      if (match) {
        const next = parseInt(match[1], 10) + 1;
        return {
          success: true,
          data: `INV-${next.toString().padStart(4, "0")}`,
        };
      }
    }

    return { success: true, data: "INV-0001" };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function createInvoice(
  orgId: string,
  formData: InvoiceInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = invoiceSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase } = await getAuthUser();
    const { data: items } = parsed;

    const subtotal = items.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    const taxRate = items.tax_rate;
    const taxAmount = Math.round(subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    const numberResult = await getNextInvoiceNumber(orgId);
    if (!numberResult.success) {
      return { success: false, error: numberResult.error };
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        org_id: orgId,
        client_id: items.client_id,
        appointment_id: items.appointment_id || null,
        invoice_number: numberResult.data,
        status: "draft",
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        due_date: items.due_date || null,
        notes: items.notes || null,
      })
      .select("id")
      .single();

    if (invoiceError) return { success: false, error: invoiceError.message };

    const invoiceItems = items.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      item_type: item.item_type || null,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsError) return { success: false, error: itemsError.message };

    // Si la factura está ligada a una cita de peluquería con abono cobrado,
    // pre-cargamos ese abono como pago parcial automáticamente. Así el
    // recepcionista no tiene que sumar/restar a mano: el saldo pendiente
    // (total - abono) queda calculado por el trigger de payments y la factura
    // arranca en `partial_paid` (o `paid` si el abono cubre el total).
    if (items.appointment_id) {
      const { data: appt } = await supabase
        .from("appointments")
        .select("deposit_amount, type")
        .eq("id", items.appointment_id)
        .maybeSingle();

      const depositAmount = appt?.deposit_amount;
      if (
        appt?.type === "grooming" &&
        depositAmount != null &&
        depositAmount > 0
      ) {
        const reference = `deposit:${items.appointment_id}`;

        // Idempotencia: si por algún motivo ya existe el payment del abono
        // (reintentos, doble-submit), no lo dupliquemos.
        const { data: existing } = await supabase
          .from("payments")
          .select("id")
          .eq("invoice_id", invoice.id)
          .eq("reference", reference)
          .maybeSingle();

        if (!existing) {
          // Cap defensivo: si el total facturado fue menor al abono (tarifa
          // ajustada hacia abajo), no registramos un pago mayor al total.
          // El excedente queda como nota manual — la devolución de abonos
          // todavía no está modelada (se resuelve fuera del sistema).
          const cappedAmount = Math.min(depositAmount, total);

          await supabase.from("payments").insert({
            org_id: orgId,
            invoice_id: invoice.id,
            amount: cappedAmount,
            method: "cash",
            reference,
            notes: "Abono cobrado al confirmar la cita",
          });

          // El trigger recalc_invoice_amount_paid actualizó amount_paid pero
          // NO el status (la factura sigue en draft, ese estado es explícito).
          // Pasamos manualmente a sent / partial_paid / paid para que la
          // factura ya nazca emitida con el abono visible.
          const nextStatus =
            cappedAmount + 0.009 >= total ? "paid" : "partial_paid";

          await supabase
            .from("invoices")
            .update({
              status: nextStatus,
              paid_at:
                nextStatus === "paid" ? new Date().toISOString() : null,
            })
            .eq("id", invoice.id);
        }
      }
    }

    revalidatePath("/[clinic]/billing", "page");
    return { success: true, data: { id: invoice.id } };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function updateInvoice(
  orgId: string,
  invoiceId: string,
  formData: InvoiceUpdateInput
): Promise<ActionResult> {
  try {
    const parsed = invoiceUpdateSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase } = await getAuthUser();

    const check = await getInvoiceInOrg(supabase, invoiceId, orgId);
    if (!check.ok) return { success: false, error: check.error };
    if (check.invoice.status !== "draft") {
      return {
        success: false,
        error: "Solo se pueden editar facturas en borrador",
      };
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.tax_rate !== undefined) {
      updateData.tax_rate = parsed.data.tax_rate;

      const { data: items } = await supabase
        .from("invoice_items")
        .select("total")
        .eq("invoice_id", invoiceId);

      const subtotal = (items ?? []).reduce(
        (sum, item) => sum + Number(item.total),
        0
      );
      const taxAmount = Math.round(subtotal * parsed.data.tax_rate) / 100;
      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total = subtotal + taxAmount;
    }
    if (parsed.data.due_date !== undefined)
      updateData.due_date = parsed.data.due_date;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const { error } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId)
      .eq("org_id", orgId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/[clinic]/billing", "page");
    revalidatePath(`/[clinic]/billing/${invoiceId}`, "page");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

async function recalculateInvoiceTotals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string
) {
  const { data: items } = await supabase
    .from("invoice_items")
    .select("total")
    .eq("invoice_id", invoiceId);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("tax_rate")
    .eq("id", invoiceId)
    .single();

  const subtotal = (items ?? []).reduce(
    (sum, item) => sum + Number(item.total),
    0
  );
  const taxRate = Number(invoice?.tax_rate ?? 0);
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  await supabase
    .from("invoices")
    .update({ subtotal, tax_amount: taxAmount, total })
    .eq("id", invoiceId);
}

export async function addInvoiceItem(
  orgId: string,
  invoiceId: string,
  item: InvoiceItemInput
): Promise<ActionResult> {
  try {
    const parsed = invoiceItemSchema.safeParse(item);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase } = await getAuthUser();

    const check = await getInvoiceInOrg(supabase, invoiceId, orgId);
    if (!check.ok) return { success: false, error: check.error };
    if (check.invoice.status !== "draft") {
      return {
        success: false,
        error: "Solo se pueden modificar items en facturas en borrador",
      };
    }

    const { error } = await supabase.from("invoice_items").insert({
      invoice_id: invoiceId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unit_price,
      total: parsed.data.quantity * parsed.data.unit_price,
      item_type: parsed.data.item_type || null,
    });

    if (error) return { success: false, error: error.message };

    await recalculateInvoiceTotals(supabase, invoiceId);

    revalidatePath(`/[clinic]/billing/${invoiceId}`, "page");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function removeInvoiceItem(
  orgId: string,
  itemId: string,
  invoiceId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await getAuthUser();

    const check = await getInvoiceInOrg(supabase, invoiceId, orgId);
    if (!check.ok) return { success: false, error: check.error };
    if (check.invoice.status !== "draft") {
      return {
        success: false,
        error: "Solo se pueden modificar items en facturas en borrador",
      };
    }

    const { error } = await supabase
      .from("invoice_items")
      .delete()
      .eq("id", itemId)
      .eq("invoice_id", invoiceId);

    if (error) return { success: false, error: error.message };

    await recalculateInvoiceTotals(supabase, invoiceId);

    revalidatePath(`/[clinic]/billing/${invoiceId}`, "page");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function updateInvoiceStatus(
  orgId: string,
  invoiceId: string,
  status: InvoiceStatus
): Promise<ActionResult> {
  try {
    const { supabase } = await getAuthUser();

    const check = await getInvoiceInOrg(supabase, invoiceId, orgId);
    if (!check.ok) return { success: false, error: check.error };

    const allowed = ALLOWED_STATUS_TRANSITIONS[check.invoice.status] ?? [];
    if (!allowed.includes(status)) {
      return {
        success: false,
        error: `Transicion no permitida: ${check.invoice.status} -> ${status}`,
      };
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "draft") {
      updateData.paid_at = null;
    }

    const { error } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId)
      .eq("org_id", orgId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/[clinic]/billing", "page");
    revalidatePath(`/[clinic]/billing/${invoiceId}`, "page");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function registerPayment(
  orgId: string,
  invoiceId: string,
  formData: PaymentInput
): Promise<ActionResult> {
  try {
    const parsed = paymentSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase } = await getAuthUser();

    const check = await getInvoiceInOrg(supabase, invoiceId, orgId);
    if (!check.ok) return { success: false, error: check.error };

    if (
      check.invoice.status === "paid" ||
      check.invoice.status === "cancelled" ||
      check.invoice.status === "draft"
    ) {
      return {
        success: false,
        error:
          "Solo se pueden registrar pagos en facturas enviadas, vencidas o con abono parcial",
      };
    }

    const remaining = check.invoice.total - check.invoice.amount_paid;

    if (parsed.data.amount <= 0) {
      return { success: false, error: "El monto debe ser positivo" };
    }
    if (parsed.data.amount > remaining + 0.009) {
      return {
        success: false,
        error: `El monto excede el saldo pendiente ($${Math.round(
          remaining
        ).toLocaleString("es-CL")})`,
      };
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      org_id: orgId,
      invoice_id: invoiceId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
    });

    if (paymentError) return { success: false, error: paymentError.message };

    revalidatePath("/[clinic]/billing", "page");
    revalidatePath(`/[clinic]/billing/${invoiceId}`, "page");
    revalidatePath(`/[clinic]/billing/pending`, "page");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function deleteInvoice(
  orgId: string,
  invoiceId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await getAuthUser();

    const check = await getInvoiceInOrg(supabase, invoiceId, orgId);
    if (!check.ok) return { success: false, error: check.error };
    if (check.invoice.status !== "draft") {
      return {
        success: false,
        error: "Solo se pueden eliminar facturas en borrador",
      };
    }

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId)
      .eq("org_id", orgId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/[clinic]/billing", "page");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function getClients(
  orgId: string
): Promise<ActionResult<{ id: string; first_name: string; last_name: string }[]>> {
  try {
    const { supabase } = await getAuthUser();

    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("org_id", orgId)
      .order("first_name");

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export type PendingInvoiceRow = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  amount_paid: number;
  remaining: number;
  due_date: string | null;
  created_at: string;
};

export type PendingByClient = {
  client_id: string;
  client_name: string;
  client_phone: string | null;
  total_pending: number;
  invoice_count: number;
  invoices: PendingInvoiceRow[];
};

export async function getPendingInvoicesByClient(
  orgId: string
): Promise<ActionResult<PendingByClient[]>> {
  try {
    const { supabase } = await getAuthUser();

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id, invoice_number, status, total, amount_paid, due_date, created_at,
        client:clients!client_id (id, first_name, last_name, phone)
        `
      )
      .eq("org_id", orgId)
      .in("status", ["sent", "overdue", "partial_paid"])
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) return { success: false, error: error.message };

    type Row = {
      id: string;
      invoice_number: string;
      status: InvoiceStatus;
      total: number | string;
      amount_paid: number | string;
      due_date: string | null;
      created_at: string;
      client: {
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
      };
    };

    const grouped = new Map<string, PendingByClient>();

    for (const row of (data ?? []) as unknown as Row[]) {
      const total = Number(row.total);
      const paid = Number(row.amount_paid);
      const remaining = Math.max(total - paid, 0);
      if (remaining <= 0.009) continue;

      const clientId = row.client.id;
      const clientName = `${row.client.first_name} ${row.client.last_name}`;

      if (!grouped.has(clientId)) {
        grouped.set(clientId, {
          client_id: clientId,
          client_name: clientName,
          client_phone: row.client.phone,
          total_pending: 0,
          invoice_count: 0,
          invoices: [],
        });
      }

      const bucket = grouped.get(clientId)!;
      bucket.total_pending += remaining;
      bucket.invoice_count += 1;
      bucket.invoices.push({
        id: row.id,
        invoice_number: row.invoice_number,
        status: row.status,
        total,
        amount_paid: paid,
        remaining,
        due_date: row.due_date,
        created_at: row.created_at,
      });
    }

    const result = Array.from(grouped.values()).sort(
      (a, b) => b.total_pending - a.total_pending
    );

    return { success: true, data: result };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}

export async function getMonthSummary(
  orgId: string
): Promise<
  ActionResult<{ invoiced: number; collected: number; pending: number }>
> {
  try {
    const { supabase } = await getAuthUser();

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data: invoices } = await supabase
      .from("invoices")
      .select("total, status")
      .eq("org_id", orgId)
      .gte("created_at", firstDay)
      .lte("created_at", lastDay + "T23:59:59")
      .neq("status", "cancelled");

    const { data: payments } = await supabase
      .from("payments")
      .select("amount, invoice_id")
      .eq("org_id", orgId)
      .gte("created_at", firstDay)
      .lte("created_at", lastDay + "T23:59:59");

    const invoiced = (invoices ?? []).reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );
    const collected = (payments ?? []).reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const pending = invoiced - collected;

    return { success: true, data: { invoiced, collected, pending } };
  } catch {
    return { success: false, error: "No autenticado" };
  }
}
