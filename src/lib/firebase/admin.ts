import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cached: { app: App; auth: Auth; db: Firestore } | null = null;

function getAdmin() {
  if (cached) return cached;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON não definida. Veja .env.example.",
    );
  }

  const app = getApps().length
    ? getApps()[0]!
    : initializeApp({ credential: cert(JSON.parse(raw)) });

  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}

export function adminAuth() {
  return getAdmin().auth;
}

export function adminDb() {
  return getAdmin().db;
}
