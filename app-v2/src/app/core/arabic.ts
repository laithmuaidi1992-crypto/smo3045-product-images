/** Arabic-aware normalisation for search: folds hamza forms, taa marbuta, alef maqsura, diacritics, digits. */
const DIAC = /[ً-ْٰـ]/g;
const AR_DIGITS = /[٠-٩]/g;
export function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(DIAC, '')
    .replace(AR_DIGITS, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
/** prices in JOD always show 2–3 decimals like the shelf labels: 1.250 */
export const jod = (n: number) => (Number(n) || 0).toFixed(3);
export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'سهرة سعيدة';
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'نهارك سعيد';
  return 'مساء الخير';
}
