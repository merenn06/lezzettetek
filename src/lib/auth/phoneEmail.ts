import { normalizePhoneTR } from '@/lib/phone/normalizePhoneTR';

export function phoneToEmail(phone: string): string {
  const normalized = normalizePhoneTR(phone);
  return `p${normalized.replace(/^\+/, '')}@phone.lezzettetek.local`;
}
