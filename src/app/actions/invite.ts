"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/firebase/session";

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
  const session = await getSession();
  if (!session) redirect("/login");

  const userRef = adminDb().collection("users").doc(session.uid);
  const userSnap = await userRef.get();
  const user = userSnap.data();
  if (!user?.currentHouseholdId) {
    throw new Error("Crie uma família antes de convidar.");
  }

  const householdRef = adminDb()
    .collection("households")
    .doc(user.currentHouseholdId);
  const householdSnap = await householdRef.get();
  const household = householdSnap.data();
  if (!household) throw new Error("Família não encontrada.");

  const member = household.members?.[session.uid];
  if (member?.role !== "owner") {
    throw new Error("Só o dono pode gerar convites.");
  }

  const token = genToken();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_MS);

  await householdRef.collection("invites").add({
    token,
    invitedBy: session.uid,
    invitedByName: user.name,
    householdName: household.name,
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
  const session = await getSession();
  if (!session) redirect(`/login?next=/invite/${token}`);

  const monthlyIncome = Number(formData.get("monthlyIncome") ?? 0);
  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
    return { fieldErrors: { monthlyIncome: "Renda inválida" } };
  }

  const query = await adminDb()
    .collectionGroup("invites")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (query.empty) return { error: "Convite não encontrado." };
  const inviteDoc = query.docs[0]!;
  const invite = inviteDoc.data();
  const householdRef = inviteDoc.ref.parent.parent;
  if (!householdRef) return { error: "Convite malformado." };

  if (invite.status !== "pending") {
    return { error: "Este convite já foi usado ou expirou." };
  }
  if ((invite.expiresAt as Timestamp).toMillis() < Date.now()) {
    await inviteDoc.ref.update({ status: "expired" });
    return { error: "Este convite expirou." };
  }

  const userRef = adminDb().collection("users").doc(session.uid);
  const userSnap = await userRef.get();
  const user = userSnap.data();
  if (!user) return { error: "Usuário não encontrado." };

  const householdSnap = await householdRef.get();
  const household = householdSnap.data();
  if (!household) return { error: "Família não encontrada." };

  if (household.memberIds?.includes(session.uid)) {
    return { error: "Você já faz parte dessa família." };
  }

  const now = Timestamp.now();
  const newCombined =
    (household.combinedMonthlyIncome ?? 0) + monthlyIncome;

  await adminDb().runTransaction(async (tx) => {
    tx.update(householdRef, {
      [`members.${session.uid}`]: {
        role: "member",
        name: user.name,
        photoURL: user.photoURL ?? null,
        monthlyIncome,
        joinedAt: now,
      },
      memberIds: FieldValue.arrayUnion(session.uid),
      combinedMonthlyIncome: newCombined,
    });

    tx.update(userRef, {
      currentHouseholdId: householdRef.id,
      householdIds: FieldValue.arrayUnion(householdRef.id),
    });

    tx.update(inviteDoc.ref, {
      status: "accepted",
      usedBy: session.uid,
    });
  });

  revalidatePath("/", "layout");
  redirect("/?toast=invite-accepted");
}
