import "server-only";
import twilio from "twilio";
import type {
  NotificationProvider,
  SendResult,
  TemplateMessage,
} from "./types";
import { getTemplateContentSid } from "./templates";

export class TwilioWhatsAppProvider implements NotificationProvider {
  readonly channel = "whatsapp" as const;
  private readonly client: twilio.Twilio;
  private readonly from: string;

  constructor(config: {
    accountSid: string;
    authToken: string;
    from: string; // ej: "whatsapp:+14155238886" (sandbox) o el número productivo
  }) {
    this.client = twilio(config.accountSid, config.authToken);
    this.from = config.from;
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    const contentSid = getTemplateContentSid(message.template);
    if (!contentSid) {
      return {
        status: "failed",
        errorCode: "template_not_configured",
        errorMessage: `No ContentSid configurado para ${message.template}`,
      };
    }

    try {
      const response = await this.client.messages.create({
        from: this.from,
        to: `whatsapp:${message.to}`,
        contentSid,
        contentVariables: JSON.stringify(message.variables),
      });

      // Twilio devuelve status 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
      const status = normalizeStatus(response.status);
      return {
        status,
        providerMessageId: response.sid,
        errorCode: response.errorCode ? String(response.errorCode) : undefined,
        errorMessage: response.errorMessage ?? undefined,
      };
    } catch (err) {
      const error = err as {
        code?: number | string;
        message?: string;
        status?: number;
      };
      return {
        status: "failed",
        errorCode: error.code ? String(error.code) : "twilio_error",
        errorMessage: error.message ?? "Error desconocido de Twilio",
      };
    }
  }
}

function normalizeStatus(raw: string): SendResult["status"] {
  switch (raw) {
    case "queued":
    case "accepted":
    case "scheduled":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
    case "undelivered":
    case "canceled":
      return "failed";
    default:
      return "queued";
  }
}
