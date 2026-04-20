import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fincasa — Finanças da casa, em família",
    short_name: "Fincasa",
    description:
      "PWA de controle financeiro familiar. Organize as finanças de casa, em família.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0D10",
    theme_color: "#0B0D10",
    lang: "pt-BR",
    categories: ["finance", "productivity", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
