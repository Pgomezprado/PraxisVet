export type MemberRole = "admin" | "vet" | "receptionist" | "groomer";
export type Plan = "basico" | "pro" | "enterprise";
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "expired"
  | "cancelled";
export type Species = "canino" | "felino" | "exotico";
export type Sex = "male" | "female";
export type ReproductiveStatus = "intact" | "sterilized";
export type ServiceCategory = "consultation" | "surgery" | "grooming" | "vaccine" | "lab" | "imaging" | "other";
export type AppointmentType = "medical" | "grooming";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "no_show";
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
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_status: SubscriptionStatus;
  whatsapp_reminders_enabled: boolean;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string | null;
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
  rut: string | null;
  email: string | null;
  phone: string | null;
  phone_e164: string | null;
  whatsapp_opt_in: boolean;
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
  reproductive_status: ReproductiveStatus | null;
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
  assigned_to: string;
  service_id: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export interface GroomingRecord {
  id: string;
  org_id: string;
  pet_id: string;
  appointment_id: string | null;
  groomer_id: string | null;
  date: string;
  service_performed: string | null;
  observations: string | null;
  products_used: Record<string, unknown> | null;
  created_at: string;
}

export interface PhysicalExam {
  mucous_color?: "rosadas" | "pálidas" | "ictéricas" | "cianóticas" | "congestivas";
  ear_inspection?: "normal" | "cerumen" | "otitis" | "otro";
  ear_notes?: string;
  cough_reflex?: "negativo" | "positivo";
  lymph_nodes?: "normales" | "aumentados" | "no_palpables";
  lymph_nodes_notes?: string;
  abdominal_palpation?: "normal" | "dolor" | "masa" | "otro";
  abdominal_palpation_notes?: string;
  consciousness?: "alerta" | "deprimido" | "estuporoso" | "comatoso";
  general_findings?: string;
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
  heart_rate_unmeasurable: boolean;
  heart_auscultation_status: "sin_hallazgos" | "con_hallazgos" | null;
  heart_auscultation_findings: string | null;
  respiratory_rate: number | null;
  respiratory_auscultation_status: "sin_hallazgos" | "con_hallazgos" | null;
  respiratory_auscultation_findings: string | null;
  capillary_refill_seconds: number | null;
  skin_fold_seconds: number | null;
  physical_exam: PhysicalExam | null;
  next_consultation_date: string | null;
  next_consultation_note: string | null;
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
  protocol_id: string | null;
  dose_id: string | null;
  vaccine_catalog_id: string | null;
  created_at: string;
}

export type VaccineLifeStage = "puppy" | "kitten" | "adulto" | "anual";

export interface VaccineCatalogEntry {
  id: string;
  code: string;
  name: string;
  species: Species[];
  is_active: boolean;
  created_at: string;
}

export interface VaccineProtocol {
  id: string;
  vaccine_id: string;
  code: string;
  name: string;
  species: Species;
  life_stage: VaccineLifeStage;
  created_at: string;
}

export interface VaccineProtocolDose {
  id: string;
  protocol_id: string;
  sequence: number;
  name: string;
  interval_days: number;
  created_at: string;
}

export interface OrganizationVaccinePreference {
  org_id: string;
  vaccine_id: string;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export type DewormingType = "interna" | "externa";

export interface Deworming {
  id: string;
  org_id: string;
  pet_id: string;
  clinical_record_id: string | null;
  vet_id: string | null;
  type: DewormingType;
  date_administered: string;
  product: string | null;
  next_due_date: string | null;
  pregnant_cohabitation: boolean;
  notes: string | null;
  created_at: string;
}

export type ReminderType = "vaccination" | "deworming" | "appointment";
export type ReminderStatus = "pending" | "sent" | "done" | "cancelled";

export interface Reminder {
  id: string;
  org_id: string;
  pet_id: string;
  type: ReminderType;
  source_table: string | null;
  source_id: string | null;
  due_date: string;
  status: ReminderStatus;
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
  is_retained: boolean;
  retained_copy_url: string | null;
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
