import type { Metadata } from "next";
import Link from "next/link";
import { Timestamp } from "firebase-admin/firestore";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getBaseUrl } from "@/lib/base-url";
import { EditIncomeDialog } from "./edit-income-dialog";
import { InviteSection } from "./invite-section";

export const metadata: Metadata = { title: "Família" };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function HouseholdSettingsPage() {
  const { uid, household, householdId, isOwner } =
    await requireHouseholdContext();

  const householdRef = adminDb().collection("households").doc(householdId);
  const pendingInvitesSnap = await householdRef
    .collection("invites")
    .where("status", "==", "pending")
    .get();

  const base = await getBaseUrl();
  // Server component: Date.now() é avaliado uma vez por request.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const pendingInvites = pendingInvitesSnap.docs
    .map((d) => {
      const data = d.data();
      const expiresAt = (data.expiresAt as Timestamp).toMillis();
      if (expiresAt < nowMs) return null;
      return {
        id: d.id,
        token: data.token as string,
        url: `${base}/invite/${data.token}`,
        expiresAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const members = Object.entries(household.members as Record<string, { name: string; role: string; monthlyIncome: number }>).map(
    ([uid, m]) => ({ uid, ...m }),
  );

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-10 max-w-2xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{household.name}</h1>
          <p className="text-sm text-muted-foreground">
            Renda combinada:{" "}
            <span className="text-foreground font-medium">
              {BRL.format(household.combinedMonthlyIncome ?? 0)}
            </span>
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Membros
        </h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const isSelf = m.uid === uid;
            return (
              <li
                key={m.uid}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium">
                    {m.name}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (você)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.role === "owner" ? "Dono" : "Membro"}
                    {" · "}
                    {BRL.format(m.monthlyIncome)}
                  </p>
                </div>
                {isSelf ? (
                  <EditIncomeDialog currentIncome={m.monthlyIncome} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {isOwner ? (
        <InviteSection pendingInvites={pendingInvites} nowMs={nowMs} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Só o dono da família pode gerar convites.
        </p>
      )}
    </main>
  );
}
