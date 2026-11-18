import path from "node:path";
import sharp from "sharp";

export const VARIANTS = [480, 960, 1600] as const;

/** 64-bit difference hash. Near-identical images differ in only a few bits (ADR-006). */
async function dHash(buf: Buffer): Promise<string> {
  const px = await sharp(buf).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    bits = (bits << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  }
  return BigInt.asIntN(64, bits).toString(); // Postgres bigint is signed
}

export type ProcessedPhoto = {
  variants: Record<(typeof VARIANTS)[number], Buffer>;
  blur: string; phash: string; width: number; height: number;
};

export async function processPhoto(input: Buffer, opts: { watermark: boolean; minWidth: number; minHeight: number }): Promise<ProcessedPhoto> {
  const rotated = await sharp(input, { failOn: "none" }).rotate().toBuffer({ resolveWithObject: true });
  const { width, height } = rotated.info;
  if (width < opts.minWidth || height < opts.minHeight) {
    throw new Error(`Photo is too small. Use at least ${opts.minWidth} by ${opts.minHeight} pixels.`);
  }
  const wmFile = path.join(process.cwd(), "public", "brand", "watermark.png");

  const variants = {} as ProcessedPhoto["variants"];
  for (const w of VARIANTS) {
    const resized = await sharp(rotated.data).resize({ width: w, withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
    let pipe = sharp(resized.data);
    if (opts.watermark) {
      const mark = await sharp(wmFile).resize({ width: Math.round(resized.info.width * 0.22) }).toBuffer();
      pipe = pipe.composite([{ input: mark, gravity: "southeast" }]);
    }
    variants[w] = await pipe.webp({ quality: 78 }).toBuffer();
  }
  const blurBuf = await sharp(rotated.data).resize(16).webp({ quality: 40 }).toBuffer();
  return { variants, blur: `data:image/webp;base64,${blurBuf.toString("base64")}`, phash: await dHash(rotated.data), width, height };
}
