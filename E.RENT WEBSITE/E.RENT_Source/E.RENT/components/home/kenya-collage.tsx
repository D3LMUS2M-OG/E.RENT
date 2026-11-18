import { KENYA_COUNTY_SHAPES, KENYA_OUTLINE_PATH, MAP_H, MAP_W } from "@/lib/kenya-geo";

// Tiles are pre-cropped at 3x so they stay sharp on high-density screens, with every face centred in the part of the tile that is inside Kenya.
const CELLS = [
  { n: "a", x: 24, y: 24, w: 236, h: 596, alt: "A family holding the keys to their new home" },
  { n: "b", x: 272, y: 24, w: 224, h: 262, alt: "A family relaxing in their new living room" },
  { n: "c", x: 272, y: 298, w: 224, h: 322, alt: "A family outside their apartment building" },
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
        {CELLS.map((c, i) => <image key={c.n} href={`/landing/tile-${c.n}.webp`} x={c.x} y={c.y} width={c.w} height={c.h} preserveAspectRatio="none" clipPath={`url(#cell-${i})`}><title>{c.alt}</title></image>)}
      </g>
      <path d={KENYA_OUTLINE_PATH} fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
