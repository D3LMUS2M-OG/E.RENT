const KEY = "erent-compare";
export const MAX_COMPARE = 4;

export function getCompare(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX_COMPARE) : []; } catch { return []; }
}
export function setCompare(slugs: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(slugs.slice(0, MAX_COMPARE))); } catch {}
  window.dispatchEvent(new Event("erent:compare"));
}
