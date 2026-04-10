export type MemberRole = "admin" | "vet" | "receptionist";
export type Plan = "free" | "pro" | "enterprise";
export type Species = "dog" | "cat" | "bird" | "rabbit" | "reptile" | "other";
export type Sex = "male" | "female";
export type ServiceCategory = "consultation" | "surgery" | "grooming" | "vaccine" | "lab" | "imaging" | "other";
export type AppointmentStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "card" | "transfer" | "other";
export type ProductCategory = "medicine" | "supply" | "food" | "accessory" | "other";
export type ProductUnit = "unit" | "ml" | "mg" | "box" | "kg" | "g";
export type StockMovementType = "in" | "out" | "adjustment";
export type StockMovementReason = "purchase" | "sale" | "usage" | "loss" | "return" | "adjustment";
export type AttachmentEntityType = "pet" | "clinical_record" | "appointment";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  species: Species | null;
  breed: string | null;
  color: string | null;
  sex: Sex | null;
  birthdate: string | null;
  microchip: string | null;
  photo_url: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  category: ServiceCategory | null;
  duration_minutes: number;
  price: number | null;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  org_id: string;
  pet_id: string;
  client_id: string;
  vet_id: string;
  service_id: string | null;
  status: AppointmentStatus;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export interface ClinicalRecord {
  id: string;
  org_id: string;
  pet_id: string;
  appointment_id: string | null;
  vet_id: string;
  date: string;
  reason: string | null;
  anamnesis: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  observations: string | null;
  weight: number | null;
  temperature: number | null;
  heart_rate: number | null;
  created_at: string;
}

export interface Vaccination {
  id: string;
  org_id: string;
  pet_id: string;
  clinical_record_id: string | null;
  vaccine_name: string;
  lot_number: string | null;
  date_administered: string;
  next_due_date: string | null;
  vet_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Prescription {
  id: string;
  org_id: string;
  clinical_record_id: string;
  medication: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  org_id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Invoice {
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
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: "service" | "product" | null;
  created_at: string;
}

export interface Payment {
  id: string;
  org_id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  org_id: string;
  name: string;
  sku: string | null;
  category: ProductCategory | null;
  description: string | null;
  unit: ProductUnit;
  purchase_price: number | null;
  sale_price: number | null;
  min_stock: number;
  active: boolean;
  created_at: string;
}

export interface Stock {
  id: string;
  product_id: string;
  org_id: string;
  quantity: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  org_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reason: StockMovementReason | null;
  reference_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  org_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}
