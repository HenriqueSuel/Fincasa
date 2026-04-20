import "server-only";
import { headers } from "next/headers";

/**
 * Retorna a base URL do deploy atual. Ordem de precedência:
 *
 *   1. `NEXT_PUBLIC_APP_URL` se definido (escape hatch pra custom domain)
 *   2. `VERCEL_URL` (fornecido automaticamente pela Vercel)
 *   3. Header `host` da request atual (útil em dev e em qualquer host)
 *
 * Sem querer forçar o usuário a configurar env var em cada ambiente.
 */
export async function getBaseUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
