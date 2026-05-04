"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  productSchema,
  stockMovementSchema,
  type ProductInput,
  type StockMovementInput,
} from "@/lib/validations/inventory";
import type { Product, Stock, StockMovement } from "@/types";
import { escapePostgrestSearch, normalizeSearchTerm } from "@/lib/utils/search";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export interface ProductWithStock extends Product {
  stock_quantity: number;
  low_stock: boolean;
}

export async function getProducts(
  orgId: string,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
  }
): Promise<ActionResult<{ data: ProductWithStock[]; total: number }>> {
  const { supabase } = await getAuthUser();

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 25;
  const search = options?.search?.trim() ?? "";
  const category = options?.category ?? "";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*, stock(quantity)", { count: "exact", head: false })
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (search) {
    const safe = escapePostgrestSearch(search);
    if (safe) {
      const safeNorm = normalizeSearchTerm(safe);
      query = query.or(
        `name_search.ilike.%${safeNorm}%,sku.ilike.%${safe}%`
      );
    }
  }

  if (category) {
    query = query.eq("category", category);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const products = (data ?? []).map((product) => {
    const { stock, ...rest } = product;
    const stockData = Array.isArray(stock) && stock.length > 0 ? stock[0] : null;
    const stock_quantity = (stockData as { quantity: number } | null)?.quantity ?? 0;
    return {
      ...rest,
      stock_quantity,
      low_stock: stock_quantity <= rest.min_stock,
    } as ProductWithStock;
  });

  return { success: true, data: { data: products, total: count ?? 0 } };
}

export interface ProductDetail extends Product {
  stock_quantity: number;
  low_stock: boolean;
  movements: StockMovement[];
}

export async function getProduct(
  productId: string
): Promise<ActionResult<ProductDetail>> {
  const { supabase } = await getAuthUser();

  const { data: product, error } = await supabase
    .from("products")
    .select("*, stock(quantity)")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { success: false, error: "Producto no encontrado" };
  }

  const { stock, ...rest } = product;
  const stockData = Array.isArray(stock) && stock.length > 0 ? stock[0] : null;
  const stock_quantity = (stockData as { quantity: number } | null)?.quantity ?? 0;

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    success: true,
    data: {
      ...rest,
      stock_quantity,
      low_stock: stock_quantity <= rest.min_stock,
      movements: (movements ?? []) as StockMovement[],
    } as ProductDetail,
  };
}

export async function createProduct(
  orgId: string,
  clinicSlug: string,
  input: ProductInput
): Promise<ActionResult<Product>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("products")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      description: parsed.data.description || null,
      unit: parsed.data.unit,
      purchase_price: parsed.data.purchase_price ? Number(parsed.data.purchase_price) : null,
      sale_price: parsed.data.sale_price ? Number(parsed.data.sale_price) : null,
      min_stock: parsed.data.min_stock ? Number(parsed.data.min_stock) : 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const { error: stockError } = await supabase.from("stock").insert({
    product_id: data.id,
    org_id: orgId,
    quantity: 0,
  });

  if (stockError) {
    return { success: false, error: stockError.message };
  }

  revalidatePath(`/${clinicSlug}/inventory`);
  return { success: true, data: data as Product };
}

export async function updateProduct(
  productId: string,
  clinicSlug: string,
  input: ProductInput
): Promise<ActionResult<Product>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      description: parsed.data.description || null,
      unit: parsed.data.unit,
      purchase_price: parsed.data.purchase_price ? Number(parsed.data.purchase_price) : null,
      sale_price: parsed.data.sale_price ? Number(parsed.data.sale_price) : null,
      min_stock: parsed.data.min_stock ? Number(parsed.data.min_stock) : 0,
    })
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/inventory`);
  revalidatePath(`/${clinicSlug}/inventory/${productId}`);
  return { success: true, data: data as Product };
}

export async function deleteProduct(
  productId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { count } = await supabase
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (count && count > 0) {
    const { error } = await supabase
      .from("products")
      .update({ active: false })
      .eq("id", productId);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error: stockError } = await supabase
      .from("stock")
      .delete()
      .eq("product_id", productId);

    if (stockError) {
      return { success: false, error: stockError.message };
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath(`/${clinicSlug}/inventory`);
  return { success: true, data: undefined };
}

export async function toggleProductActive(
  productId: string,
  currentActive: boolean,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { error } = await supabase
    .from("products")
    .update({ active: !currentActive })
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/inventory`);
  revalidatePath(`/${clinicSlug}/inventory/${productId}`);
  return { success: true, data: undefined };
}

export async function registerMovement(
  orgId: string,
  clinicSlug: string,
  input: StockMovementInput
): Promise<ActionResult<StockMovement>> {
  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase, user } = await getAuthUser();

  const { data: currentStock, error: stockError } = await supabase
    .from("stock")
    .select("id, quantity")
    .eq("product_id", parsed.data.product_id)
    .eq("org_id", orgId)
    .single();

  if (stockError || !currentStock) {
    return { success: false, error: "No se encontro el registro de stock" };
  }

  const qty = Number(parsed.data.quantity);
  if (isNaN(qty) || qty <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a 0" };
  }

  let newQuantity: number;

  if (parsed.data.type === "in") {
    newQuantity = currentStock.quantity + qty;
  } else if (parsed.data.type === "out") {
    newQuantity = currentStock.quantity - qty;
    if (newQuantity < 0) {
      return {
        success: false,
        error: `Stock insuficiente. Stock actual: ${currentStock.quantity}`,
      };
    }
  } else {
    newQuantity = qty;
  }

  const { error: updateError } = await supabase
    .from("stock")
    .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq("id", currentStock.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { data: movement, error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      org_id: orgId,
      product_id: parsed.data.product_id,
      type: parsed.data.type,
      quantity: qty,
      reason: parsed.data.reason || null,
      performed_by: user.id,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (movementError) {
    return { success: false, error: movementError.message };
  }

  revalidatePath(`/${clinicSlug}/inventory`);
  revalidatePath(`/${clinicSlug}/inventory/${parsed.data.product_id}`);
  return { success: true, data: movement as StockMovement };
}

export async function getStockAlerts(
  orgId: string
): Promise<ActionResult<ProductWithStock[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("products")
    .select("*, stock(quantity)")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const alerts = (data ?? [])
    .map((product) => {
      const { stock, ...rest } = product;
      const stockData =
        Array.isArray(stock) && stock.length > 0 ? stock[0] : null;
      const stock_quantity =
        (stockData as { quantity: number } | null)?.quantity ?? 0;
      return {
        ...rest,
        stock_quantity,
        low_stock: true,
      } as ProductWithStock;
    })
    .filter((p) => p.stock_quantity <= p.min_stock);

  return { success: true, data: alerts };
}
