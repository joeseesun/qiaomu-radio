export const RADIO_THEME_IDS = ["classic", "pocket"] as const;

export type RadioThemeId = typeof RADIO_THEME_IDS[number];

export interface RadioTheme {
  id: RadioThemeId;
  label: string;
}

export const RADIO_THEMES: RadioTheme[] = [
  { id: "classic", label: "原版" },
  { id: "pocket", label: "iPod" },
];

export function normalizeTheme(value: unknown): RadioThemeId {
  return value === "pocket" ? "pocket" : "classic";
}
