export type Availability = { days: number[]; start_time: string; end_time: string; note: string };
const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hm = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h}:${String(m).padStart(2, "0")}`; };

/** "Mon to Fri, 8:00 to 18:00" */
export function describeAvailability(a: Availability): string {
  const d = [...a.days].sort((x, y) => x - y);
  const run = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  const days = d.length === 7 ? "Every day" : run && d.length > 2 ? `${DAY[d[0]]} to ${DAY[d[d.length - 1]]}` : d.map((x) => DAY[x]).join(", ");
  return `${days}, ${hm(a.start_time)} to ${hm(a.end_time)}`;
}

/** The badge tenants see: how fast this landlord usually replies. */
export function responseLabel(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  if (minutes <= 60) return "Replies within 1 hour";
  if (minutes <= 180) return "Replies within 3 hours";
  if (minutes <= 1440) return "Replies within a day";
  return null;
}
