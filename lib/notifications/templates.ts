import type { TemplateMessage, TemplateName } from "./types";

// Cada template de WhatsApp Business (Meta) se identifica con un ContentSid
// aprobado. Lo guardamos en env para no hardcodear IDs que cambian por cuenta.
export function getTemplateContentSid(template: TemplateName): string | null {
  switch (template) {
    case "appt_reminder_24h":
      return process.env.TWILIO_TPL_APPT_REMINDER_24H ?? null;
    case "vacc_reminder":
      return process.env.TWILIO_TPL_VACC_REMINDER ?? null;
    case "appt_confirmation":
      return process.env.TWILIO_TPL_APPT_CONFIRMATION ?? null;
    default:
      return null;
  }
}

// ---------- Builders tipados de cada template ----------
// Cada builder arma el TemplateMessage con las variables en el orden exacto
// que espera Meta. Si cambia el template en WABA, se cambia acá.

export type ApptReminder24hVars = {
  tutorFirstName: string;
  petName: string;
  professionalName: string;
  dateLabel: string; // "15-04"
  timeLabel: string; // "09:30"
  clinicName: string;
};

export function buildApptReminder24h(
  to: string,
  vars: ApptReminder24hVars
): TemplateMessage {
  return {
    template: "appt_reminder_24h",
    to,
    variables: {
      "1": vars.tutorFirstName,
      "2": vars.petName,
      "3": vars.professionalName,
      "4": vars.dateLabel,
      "5": vars.timeLabel,
      "6": vars.clinicName,
    },
  };
}

export type VaccReminderVars = {
  tutorFirstName: string;
  petName: string;
  dateLabel: string;
  clinicName: string;
};

export function buildVaccReminder(
  to: string,
  vars: VaccReminderVars
): TemplateMessage {
  return {
    template: "vacc_reminder",
    to,
    variables: {
      "1": vars.tutorFirstName,
      "2": vars.petName,
      "3": vars.dateLabel,
      "4": vars.clinicName,
    },
  };
}

export type ApptConfirmationVars = {
  petName: string;
  dateLabel: string;
  timeLabel: string;
  clinicName: string;
};

export function buildApptConfirmation(
  to: string,
  vars: ApptConfirmationVars
): TemplateMessage {
  return {
    template: "appt_confirmation",
    to,
    variables: {
      "1": vars.petName,
      "2": vars.dateLabel,
      "3": vars.timeLabel,
      "4": vars.clinicName,
    },
  };
}
