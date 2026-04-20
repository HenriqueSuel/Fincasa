import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { getTrip, listTripPurchases } from "@/lib/shopping-query";
import { formatBRL } from "@/lib/money";

export const metadata: Metadata = { title: "Compra" };

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const PAYMENT_LABEL: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
};

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const { householdId } = await requireHouseholdContext();

  const [trip, purchases] = await Promise.all([
    getTrip(householdId, tripId),
    listTripPurchases(householdId, tripId),
  ]);
  if (!trip) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 pb-24 max-w-2xl w-full mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href="/shopping"
          className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{trip.storeName}</h1>
          <p className="text-xs text-muted-foreground">
            {BR_DATE.format(trip.purchasedAt)} · {trip.purchasedByName}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={formatBRL(trip.total)} />
        <Stat
          label="Itens"
          value={String(trip.itemCount)}
        />
        <Stat
          label="Pagamento"
          value={
            trip.paymentMethod ? PAYMENT_LABEL[trip.paymentMethod] ?? trip.paymentMethod : "—"
          }
        />
      </section>

      <Link
        href={`/transactions/${trip.transactionId}`}
        className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ExternalLink className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Ver despesa vinculada</p>
          <p className="text-xs text-muted-foreground">
            Essa compra gerou uma despesa em Essenciais / Mercado.
          </p>
        </div>
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Itens comprados
        </h2>
        <ul className="flex flex-col gap-1.5">
          {purchases.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/shopping/items/${p.itemId}`}
                  className="text-sm font-medium hover:underline"
                >
                  {p.itemName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {[
                    p.brand,
                    p.weight ? `${p.weight.value}${p.weight.unit}` : null,
                    p.quantity > 1 ? `${p.quantity} un` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatBRL(p.price * p.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5 tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}
