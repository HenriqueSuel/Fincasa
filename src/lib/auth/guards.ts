import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/firebase/session";

export interface SessionContext {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  user: DocumentData & { name: string; currentHouseholdId: string | null };
}

export interface HouseholdContext extends SessionContext {
  householdId: string;
  household: DocumentData & {
    name: string;
    createdBy: string;
    memberIds: string[];
    members: Record<
      string,
      {
        role: "owner" | "member";
        name: string;
        photoURL?: string;
        monthlyIncome: number;
      }
    >;
    combinedMonthlyIncome: number;
  };
  isOwner: boolean;
  partnerId?: string;
}

/**
 * Valida sessão + user doc. Redireciona para /login se não autenticado.
 * Deduplicada por request via React cache().
 */
export const requireSession = cache(async (): Promise<SessionContext> => {
  const session = await getSession();
  if (!session) redirect("/login");

  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data();
  if (!user) {
    // Usuário autenticado mas sem doc — provável corrida entre signin e write.
    redirect("/login");
  }

  return {
    uid: session.uid,
    email: session.email,
    name: session.name,
    picture: session.picture,
    user: user as SessionContext["user"],
  };
});

/**
 * Variante para route handlers (API): retorna null em vez de redirecionar.
 * Útil em rotas que devem responder com 401/400 (ex: download de CSV).
 */
export async function getHouseholdContextOrNull(): Promise<HouseholdContext | null> {
  const session = await getSession();
  if (!session) return null;

  const userSnap = await adminDb().collection("users").doc(session.uid).get();
  const user = userSnap.data();
  if (!user?.currentHouseholdId) return null;

  const householdId = user.currentHouseholdId as string;
  const snap = await adminDb().collection("households").doc(householdId).get();
  const household = snap.data() as HouseholdContext["household"] | undefined;
  if (!household) return null;

  const memberIds = Array.isArray(household.memberIds)
    ? household.memberIds
    : [];
  if (!memberIds.includes(session.uid)) return null;

  const member = household.members?.[session.uid];
  return {
    uid: session.uid,
    email: session.email,
    name: session.name,
    picture: session.picture,
    user: user as SessionContext["user"],
    householdId,
    household,
    isOwner: member?.role === "owner",
    partnerId: memberIds.find((id) => id !== session.uid),
  };
}

/**
 * Valida sessão + household ativo + membership.
 * Redireciona para /login ou /onboarding conforme o caso.
 * Deduplicada por request via React cache().
 */
export const requireHouseholdContext = cache(
  async (): Promise<HouseholdContext> => {
    const ctx = await requireSession();
    if (!ctx.user.currentHouseholdId) redirect("/onboarding");

    const householdId = ctx.user.currentHouseholdId;
    const snap = await adminDb()
      .collection("households")
      .doc(householdId)
      .get();
    const household = snap.data() as HouseholdContext["household"] | undefined;

    if (!household) {
      // Ref de household morto — limpa o currentHouseholdId e manda pro onboarding.
      await adminDb()
        .collection("users")
        .doc(ctx.uid)
        .update({ currentHouseholdId: null });
      redirect("/onboarding");
    }

    const memberIds = Array.isArray(household.memberIds)
      ? household.memberIds
      : [];
    if (!memberIds.includes(ctx.uid)) {
      // User foi removido mas o ref ficou. Sanitiza e manda pro onboarding.
      await adminDb()
        .collection("users")
        .doc(ctx.uid)
        .update({ currentHouseholdId: null });
      redirect("/onboarding");
    }

    const member = household.members?.[ctx.uid];
    const partnerId = memberIds.find((id) => id !== ctx.uid);

    return {
      ...ctx,
      householdId,
      household,
      isOwner: member?.role === "owner",
      partnerId,
    };
  },
);
