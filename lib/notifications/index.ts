import "server-only";
import type { NotificationProvider } from "./types";
import { TwilioWhatsAppProvider } from "./whatsapp-twilio";

export type { NotificationProvider, TemplateMessage, SendResult } from "./types";
export * from "./templates";

let cachedProvider: NotificationProvider | null = null;

export function getWhatsAppProvider(): NotificationProvider | null {
  if (cachedProvider) return cachedProvider;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    return null;
  }

  cachedProvider = new TwilioWhatsAppProvider({ accountSid, authToken, from });
  return cachedProvider;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );
}
