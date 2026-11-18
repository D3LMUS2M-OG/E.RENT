export type ThemeChoice = "system" | "dark" | "light";
const KEY = "erent-theme";

export function getThemeChoice(): ThemeChoice {
  try { const t = localStorage.getItem(KEY); return t === "dark" || t === "light" ? t : "system"; } catch { return "system"; }
}

/** The theme that is actually showing right now (system resolved to dark or light). */
export function resolvedTheme(choice: ThemeChoice = getThemeChoice()): "dark" | "light" {
  if (choice !== "system") return choice;
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Writes the choice to the page and to the browser bar colour. Safe to call as often as needed. */
export function applyTheme(choice: ThemeChoice = getThemeChoice()) {
  const root = document.documentElement;
  if (choice === "system") { if (root.dataset.theme) delete root.dataset.theme; } else if (root.dataset.theme !== choice) root.dataset.theme = choice;
  const color = resolvedTheme(choice) === "light" ? "#ffffff" : "#111111";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}

export function setThemeChoice(choice: ThemeChoice) {
  try { if (choice === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, choice); } catch {}
  applyTheme(choice);
  window.dispatchEvent(new Event("erent:theme"));
}
