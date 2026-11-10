/** Kenyan mobile numbers: 07xx, 01xx, 2547xx, +2547xx. Returns +254XXXXXXXXX or null. */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const m = digits.match(/^(?:\+?254|0)([17]\d{8})$/);
  return m ? `+254${m[1]}` : null;
}
export const whatsappLink = (phone: string) => `https://wa.me/${phone.replace("+", "")}`;
