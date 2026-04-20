import type { MetadataRoute } from "next";

/**
 * App privado (controle financeiro familiar) — bloqueia toda indexação.
 * Gera /robots.txt automaticamente no build.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
