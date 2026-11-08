// The 47 counties of Kenya (codes follow the constitutional schedule).
// Sub-counties and wards are seeded into the database from IEBC data, see supabase/seed.sql notes.
export const COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera",
  "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
  "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia",
  "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado",
  "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay",
  "Migori", "Kisii", "Nyamira", "Nairobi",
].map((name, i) => ({
  code: i + 1,
  name,
  slug: name.toLowerCase().replace(/'/g, "").replace(/\s+/g, "-"),
}));

export const countyBySlug = (slug: string) => COUNTIES.find((c) => c.slug === slug);
