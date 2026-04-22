export type NotificationChannel = "whatsapp" | "email" | "sms";

export type NotificationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type TemplateName =
  | "appt_reminder_24h"
  | "vacc_reminder"
  | "appt_confirmation";

export type TemplateMessage = {
  template: TemplateName;
  // Destinatario en formato E.164 (+569XXXXXXXX para Chile móvil).
  to: string;
  // Variables del template, en el orden exacto que espera Meta.
  variables: Record<string, string>;
};

export type SendResult = {
  status: NotificationStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  sendTemplate(message: TemplateMessage): Promise<SendResult>;
}
