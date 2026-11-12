import { COUNTIES } from "@/lib/counties";

/** The 47 counties grouped by region, for the mega menu. */
export const REGIONS: { name: string; counties: string[] }[] = [
  { name: "Nairobi and Central", counties: ["Nairobi", "Kiambu", "Nyeri", "Murang'a", "Kirinyaga", "Nyandarua"] },
  { name: "Coast", counties: ["Mombasa", "Kilifi", "Kwale", "Lamu", "Taita-Taveta", "Tana River"] },
  { name: "Western", counties: ["Kakamega", "Bungoma", "Busia", "Vihiga"] },
  { name: "Nyanza", counties: ["Kisumu", "Siaya", "Homa Bay", "Migori", "Kisii", "Nyamira"] },
  { name: "Rift Valley", counties: ["Nakuru", "Uasin Gishu", "Kajiado", "Kericho", "Narok", "Bomet", "Nandi", "Trans Nzoia", "Laikipia", "Baringo", "Elgeyo-Marakwet", "West Pokot", "Samburu", "Turkana"] },
  { name: "Eastern", counties: ["Machakos", "Meru", "Embu", "Kitui", "Makueni", "Tharaka-Nithi", "Isiolo", "Marsabit"] },
  { name: "North Eastern", counties: ["Garissa", "Wajir", "Mandera"] },
];
export const regionLinks = REGIONS.map((r) => ({
  name: r.name,
  counties: r.counties.map((n) => COUNTIES.find((c) => c.name === n)!).filter(Boolean),
}));

/** Matches the seeded property types and amenities (admin can add more in the database). */
export const HOUSE_TYPES = [
  ["bedsitter", "Bedsitter"], ["single-room", "Single room"], ["studio", "Studio"], ["1-bedroom", "1 bedroom"], ["2-bedroom", "2 bedroom"],
  ["3-bedroom", "3 bedroom"], ["4-plus-bedroom", "4+ bedroom"], ["maisonette", "Maisonette"], ["bungalow", "Bungalow"], ["apartment", "Apartment"],
  ["townhouse", "Townhouse"], ["student-housing", "Student housing"], ["hostel", "Hostel"], ["shared-housing", "Shared housing"],
] as const;
export const QUICK_AMENITIES = [["water-24-7", "24/7 water"], ["parking", "Parking"], ["furnished", "Furnished"], ["pets-allowed", "Pets allowed"], ["wifi", "WiFi"], ["backup-generator", "Backup generator"]] as const;
