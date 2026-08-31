import type { MetadataRoute } from "next";

/**
 * Installable to the home screen.
 *
 * Offline support (phase 5) is not built yet, so this deliberately claims
 * nothing about working without a connection — it only gives the app an icon,
 * a name and a standalone window.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Операція «База»",
    short_name: "База",
    description: "42-day strength and conditioning tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#1a7a4c",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
