/** Main campuses, with approximate coordinates. They are good for "houses within a few kilometres"; widen the distance if a campus is large. */
export type University = { slug: string; name: string; town: string; lat: number; lng: number };
export const UNIVERSITIES: University[] = [
  { slug: "uon", name: "University of Nairobi", town: "Nairobi", lat: -1.279, lng: 36.817 },
  { slug: "ku", name: "Kenyatta University", town: "Nairobi", lat: -1.181, lng: 36.93 },
  { slug: "tuk", name: "Technical University of Kenya", town: "Nairobi", lat: -1.288, lng: 36.826 },
  { slug: "strathmore", name: "Strathmore University", town: "Nairobi", lat: -1.31, lng: 36.812 },
  { slug: "usiu", name: "USIU-Africa", town: "Nairobi", lat: -1.219, lng: 36.88 },
  { slug: "jkuat", name: "JKUAT", town: "Juja", lat: -1.091, lng: 37.012 },
  { slug: "mku", name: "Mount Kenya University", town: "Thika", lat: -1.048, lng: 37.083 },
  { slug: "egerton", name: "Egerton University", town: "Njoro", lat: -0.37, lng: 35.93 },
  { slug: "moi", name: "Moi University", town: "Eldoret", lat: 0.287, lng: 35.307 },
  { slug: "maseno", name: "Maseno University", town: "Maseno", lat: -0.002, lng: 34.6 },
  { slug: "mmust", name: "Masinde Muliro University (MMUST)", town: "Kakamega", lat: 0.289, lng: 34.729 },
  { slug: "kisii", name: "Kisii University", town: "Kisii", lat: -0.69, lng: 34.76 },
  { slug: "kibabii", name: "Kibabii University", town: "Bungoma", lat: 0.748, lng: 34.568 },
  { slug: "chuka", name: "Chuka University", town: "Chuka", lat: -0.332, lng: 37.65 },
  { slug: "dekut", name: "Dedan Kimathi University", town: "Nyeri", lat: -0.399, lng: 36.956 },
  { slug: "machakos", name: "Machakos University", town: "Machakos", lat: -1.517, lng: 37.264 },
  { slug: "pwani", name: "Pwani University", town: "Kilifi", lat: -3.635, lng: 39.85 },
  { slug: "tum", name: "Technical University of Mombasa", town: "Mombasa", lat: -4.046, lng: 39.667 },
];
