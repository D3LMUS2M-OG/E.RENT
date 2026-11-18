import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. A generated manifest lets related_applications point at the real site address,
// which is how a browser tab can tell the app is already installed and hide the install banner.
export default function manifest(): MetadataRoute.Manifest {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return {
    id: "/",
    name: "E.Rent",
    short_name: "E.Rent",
    description: "Find a house to rent in any of Kenya's 47 counties. Chat with landlords and read honest reviews.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111111",
    theme_color: "#111111",
    lang: "en",
    categories: ["lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search houses", short_name: "Search", url: "/search", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My chats", short_name: "Chats", url: "/chats", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    ...(site ? { related_applications: [{ platform: "webapp", url: `${site}/manifest.webmanifest` }], prefer_related_applications: false } : {}),
  };
}
