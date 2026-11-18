import { ArrowUpDown, Baby, Building2, Car, DoorOpen, Droplets, Home, PawPrint, Plug, Shield, ShieldCheck, Sofa, Sprout, Tv, Video, Waves, Wifi, Zap, type LucideIcon } from "lucide-react";

/** One icon style for every amenity: thin line, same size, same tile. Unknown amenities fall back to a house. */
export const AMENITY_ICONS: Record<string, LucideIcon> = {
  water: Droplets, "water-24-7": Waves, borehole: Droplets, "kplc-prepaid": Zap, "backup-generator": Plug, parking: Car, security: ShieldCheck, cctv: Video,
  guard: Shield, "gated-compound": Building2, wifi: Wifi, "dstv-ready": Tv, balcony: DoorOpen, lift: ArrowUpDown, furnished: Sofa, "pets-allowed": PawPrint,
  "childrens-playground": Baby, "garden-space": Sprout,
};
export const amenityIcon = (slug: string): LucideIcon => AMENITY_ICONS[slug] ?? Home;
