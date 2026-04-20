import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cached: { app: App; auth: Auth; db: Firestore } | null = null;

/**
 * Tolerante a variações comuns de formato:
 *  - `.env.local` (shell): `'{...}'` → com aspas simples envolvendo
 *  - Vercel UI: `{...}` → cru, sem aspas
 *  - Editores/copy-paste: às vezes vem com aspas duplas envolvendo
 *  - `\n` da private_key escapada como `\\n` em alguns casos
 */
function parseServiceAccount(raw: string): Record<string, unknown> {
  let cleaned = raw.trim();

  // Remove aspas envolvendo se presente
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    // Se a private_key veio com \\n (escape duplo), normaliza pra \n
    if (
      typeof parsed.private_key === "string" &&
      parsed.private_key.includes("\\n") &&
      !parsed.private_key.includes("\n")
    ) {
      parsed.private_key = (parsed.private_key as string).replace(/\\n/g, "\n");
    }
    return parsed;
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON inválido: ${
        err instanceof Error ? err.message : String(err)
      }. Confira se colou o JSON sem aspas envolvendo (Vercel UI) ou com aspas simples (.env.local).`,
    );
  }
}

function getAdmin() {
  if (cached) return cached;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON não definida. Veja .env.example.",
    );
  }

  const serviceAccount = parseServiceAccount(raw);

  const app = getApps().length
    ? getApps()[0]!
    : initializeApp({ credential: cert(serviceAccount) });

  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}

export function adminAuth() {
  return getAdmin().auth;
}

export function adminDb() {
  return getAdmin().db;
}
