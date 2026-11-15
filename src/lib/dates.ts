/** Labels for a local date string ("2026-11-14"); no timezone math happens here. */
const asUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const weekday = (iso: string) => asUtc(iso).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
export const dayMonth = (iso: string) => asUtc(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const monthLong = (iso: string) => asUtc(iso).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
export const monthShort = (iso: string) => asUtc(iso).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
