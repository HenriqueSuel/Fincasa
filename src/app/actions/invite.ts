"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext, requireSession } from "@/lib/auth/guards";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface InviteDetails {
  token: string;
  householdName: string;
  invitedByName: string;
  expiresAt: number;
  status: "pending" | "accepted" | "expired";
}

function genToken() {
  return randomUUID().replace(/-/g, "");
}

export async function createInvite(): Promise<{ token: string; url: string }> {
  const ctx = await requireHouseholdContext();
  if (!ctx.isOwner) {
    throw new Error("Só o dono pode gerar convites.");
  }

  const token = genToken();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_MS);

  await adminDb()
    .collection("households")
    .doc(ctx.householdId)
    .collection("invites")
    .add({
      token,
      invitedBy: ctx.uid,
      invitedByName: ctx.user.name,
      householdName: ctx.household.name,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

  revalidatePath("/settings/household");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { token, url: `${base}/invite/${token}` };
}

export async function getInviteByToken(
  token: string,
): Promise<InviteDetails | null> {
  const query = await adminDb()
    .collectionGroup("invites")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (query.empty) return null;
  const doc = query.docs[0]!;
  const data = doc.data();
  const expiresAt = (data.expiresAt as Timestamp).toMillis();
  const expired = expiresAt < Date.now();
  const status = expired && data.status === "pending" ? "expired" : data.status;

  return {
    token: data.token,
    householdName: data.householdName,
    invitedByName: data.invitedByName,
    expiresAt,
    status,
  };
}

export interface AcceptInviteState {
  error?: string;
  fieldErrors?: Partial<Record<"monthlyIncome", string>>;
}

export async function acceptInvite(
  token: string,
  _prev: AcceptInviteState | undefined,
  formData: FormData,
): Promise<AcceptInviteState> {
  const ctx = await requireSession();
  if (ctx.user.currentHouseholdId) {
    return {
      error: "Você já faz parte de uma família — saia antes de aceitar outro convite.",
    };
  }

  const monthlyIncome = Number(formData.get("monthlyIncome") ?? 0);
  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
    return { fieldErrors: { monthlyIncome: "Renda inválida" } };
  }

  const db = adminDb();

  const query = await db
    .collectionGroup("invites")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (query.empty) return { error: "Convite não encontrado." };
  const inviteRef = query.docs[0]!.ref;
  const householdRef = inviteRef.parent.parent;
  if (!householdRef) return { error: "Convite malformado." };

  const userRef = db.collection("users").doc(ctx.uid);
  const now = Timestamp.now();
  const householdIdRef = householdRef;

  try {
    await db.runTransaction(async (tx) => {
      const [inviteSnap, householdSnap, userSnap] = await Promise.all([
        tx.get(inviteRef),
        tx.get(householdIdRef),
        tx.get(userRef),
      ]);

      const invite = inviteSnap.data();
      const household = householdSnap.data();
      const user = userSnap.data();

      if (!invite) throw new Error("Convite não encontrado.");
      if (!household) throw new Error("Família não encontrada.");
      if (!user) throw new Error("Usuário não encontrado.");

      if (invite.status !== "pending") {
        throw new Error("Este convite já foi usado ou expirou.");
      }
      if ((invite.expiresAt as Timestamp).toMillis() < Date.now()) {
        tx.update(inviteRef, { status: "expired" });
        throw new Error("Este convite expirou.");
      }

      const memberIds = (household.memberIds as string[] | undefined) ?? [];
      if (memberIds.includes(ctx.uid)) {
        throw new Error("Você já faz parte dessa família.");
      }

      const newCombined =
        (household.combinedMonthlyIncome ?? 0) + monthlyIncome;

      tx.update(householdIdRef, {
        [`members.${ctx.uid}`]: {
          role: "member",
          name: user.name,
          photoURL: user.photoURL ?? null,
          monthlyIncome,
          joinedAt: now,
        },
        memberIds: FieldValue.arrayUnion(ctx.uid),
        combinedMonthlyIncome: newCombined,
      });

      tx.update(userRef, {
        currentHouseholdId: householdIdRef.id,
        householdIds: FieldValue.arrayUnion(householdIdRef.id),
      });

      tx.update(inviteRef, {
        status: "accepted",
        usedBy: ctx.uid,
      });
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Não foi possível aceitar o convite.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/?toast=invite-accepted");
}
