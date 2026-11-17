import { KENYA_COUNTY_SHAPES, KENYA_OUTLINE_PATH, MAP_H, MAP_W } from "@/lib/kenya-geo";

const CELLS: { x: number; y: number; w: number; h: number; src: string; fit: string; alt: string }[] = [
  { x: 0, y: 0, w: 262, h: 310, src: "/landing/family-1.webp", fit: "xMidYMid slice", alt: "A family relaxing in their new rented living room" },
  { x: 272, y: 0, w: 248, h: 225, src: "/landing/family-2.webp", fit: "xMidYMin slice", alt: "A family on the balcony holding the keys to their new home" },
  { x: 272, y: 235, w: 248, h: 215, src: "/landing/family-3.webp", fit: "xMidYMid slice", alt: "A family outside their apartment building" },
  { x: 0, y: 320, w: 262, h: 324, src: "/landing/family-2.webp", fit: "xMidYMid slice", alt: "" },
  { x: 272, y: 460, w: 248, h: 184, src: "/landing/family-3.webp", fit: "xMaxYMid slice", alt: "" },
];

/** Kenya's real outline (from the county boundaries) filled with a collage of rounded photo tiles. Plain SVG images, so nothing is scaled up or blurred. */
export function KenyaCollage() {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Map of Kenya filled with photos of families in their new homes" className="h-auto w-full drop-shadow-[0_24px_40px_rgba(0,0,0,.35)]">
      <defs>
        <clipPath id="kenya-shape">{KENYA_COUNTY_SHAPES.map(([slug, , d]) => <path key={slug} d={d} />)}</clipPath>
        {CELLS.map((c, i) => <clipPath key={i} id={`cell-${i}`}><rect x={c.x} y={c.y} width={c.w} height={c.h} rx={26} /></clipPath>)}
      </defs>
      <g clipPath="url(#kenya-shape)">
        {CELLS.map((c, i) => <image key={i} href={c.src} x={c.x} y={c.y} width={c.w} height={c.h} preserveAspectRatio={c.fit} clipPath={`url(#cell-${i})`}><title>{c.alt}</title></image>)}
      </g>
      <path d={KENYA_OUTLINE_PATH} fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={500} cy={30} r={9} fill="var(--primary)" /><circle cx={22} cy={520} r={6} fill="var(--foreground)" opacity={0.5} /><circle cx={486} cy={600} r={7} fill="var(--accent)" /><circle cx={64} cy={36} r={5} fill="var(--foreground)" opacity={0.4} />
    </svg>
  );
}
