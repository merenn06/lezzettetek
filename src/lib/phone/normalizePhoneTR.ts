export function normalizePhoneTR(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Geçersiz telefon numarası');
  }

  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }
  if (normalized.startsWith('90')) {
    normalized = normalized.slice(2);
  }

  if (!/^\d{10}$/.test(normalized) || !normalized.startsWith('5')) {
    throw new Error('Geçersiz telefon numarası');
  }

  return `+90${normalized}`;
}
