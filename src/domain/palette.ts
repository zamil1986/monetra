/** The one set of hues a Dompet or Kategori can wear (PRD 3.6: same palette as Dompet). */
export const COLORS = ["green", "blue", "teal", "olive", "orange", "violet", "magenta", "slate", "brown"] as const;
export type Color = (typeof COLORS)[number];

export const isColor = (value: string): value is Color => (COLORS as readonly string[]).includes(value);
