/**
 * Centralized Sales & Concierge Contact Configuration for Kemet Travel (Egypt).
 *
 * No phone numbers, WhatsApp numbers, or company emails are fabricated here.
 * Inject real business contact channels via Vite environment variables
 * (VITE_SALES_PHONE, VITE_SALES_WHATSAPP, VITE_SALES_EMAIL) or edit this file.
 */

interface EnvLike {
  VITE_SALES_PHONE?: string;
  VITE_SALES_WHATSAPP?: string;
  VITE_SALES_EMAIL?: string;
  VITE_OFFICE_LOCATION?: string;
}

function readEnv(): EnvLike {
  if (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: EnvLike }).env) {
    return (import.meta as unknown as { env: EnvLike }).env;
  }
  return {};
}

const env = readEnv();

const phone = (env.VITE_SALES_PHONE || '').trim();
const whatsapp = (env.VITE_SALES_WHATSAPP || '').trim();
const email = (env.VITE_SALES_EMAIL || '').trim();
const officeLocation = (env.VITE_OFFICE_LOCATION || 'Zamalek & Cairo Desk · Egypt').trim();

export interface SalesContactConfig {
  brandName: string;
  phone: string | null;
  whatsappDigits: string | null;
  whatsappDisplay: string | null;
  email: string | null;
  officeLocation: string;
  responseSlaHours: number;
  hasDirectChannels: boolean;
}

const cleanWhatsappDigits = whatsapp.replace(/[^\d]/g, '');

export const SALES_CONTACT_CONFIG: SalesContactConfig = {
  brandName: 'Kemet Travel',
  phone: phone.length > 0 ? phone : null,
  whatsappDigits: cleanWhatsappDigits.length >= 8 ? cleanWhatsappDigits : null,
  whatsappDisplay: whatsapp.length > 0 ? whatsapp : null,
  email: email.length > 3 ? email : null,
  officeLocation,
  responseSlaHours: 24,
  hasDirectChannels: phone.length > 0 || cleanWhatsappDigits.length >= 8 || email.length > 3,
};

export function buildWhatsappBookingUrl(reference: string, stayName: string): string | null {
  if (!SALES_CONTACT_CONFIG.whatsappDigits) return null;
  const text = encodeURIComponent(
    `Hello Kemet Travel Sales Team, following up on booking request ${reference} for ${stayName}.`,
  );
  return `https://wa.me/${SALES_CONTACT_CONFIG.whatsappDigits}?text=${text}`;
}

export function buildMailtoBookingUrl(reference: string, stayName: string): string | null {
  if (!SALES_CONTACT_CONFIG.email) return null;
  const subject = encodeURIComponent(`Booking Request ${reference} — ${stayName}`);
  const body = encodeURIComponent(
    `Hello Kemet Travel Sales Team,\n\nI am writing regarding booking request ${reference} for ${stayName}.\n`,
  );
  return `mailto:${SALES_CONTACT_CONFIG.email}?subject=${subject}&body=${body}`;
}
