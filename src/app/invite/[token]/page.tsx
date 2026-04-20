import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import { getInviteByToken } from "@/app/actions/invite";
import { AcceptInviteForm } from "./accept-invite-form";
import { LoginCTA } from "./login-cta";

export const metadata: Metadata = { title: "Convite" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return <InviteError title="Convite inválido" message="Este link não corresponde a nenhum convite." />;
  }
  if (invite.status === "expired") {
    return (
      <InviteError
        title="Convite expirado"
        message="Peça um novo link pra pessoa que te convidou."
      />
    );
  }
  if (invite.status === "accepted") {
    return (
      <InviteError
        title="Convite já utilizado"
        message="Esse link já foi usado. Se precisar entrar em outra família, peça um novo."
      />
    );
  }

  const session = await getSession();

  if (session) {
    const userSnap = await adminDb().collection("users").doc(session.uid).get();
    const user = userSnap.data();
    if (user?.currentHouseholdId) {
      return (
        <InviteError
          title="Você já faz parte de uma família"
          message="Saia da família atual antes de aceitar outro convite."
          cta={{ href: "/", label: "Ir para o Dashboard" }}
        />
      );
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
            <span className="text-2xl">✉️</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">
              Você foi convidado para{" "}
              <span className="text-primary">{invite.householdName}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Por {invite.invitedByName}
            </p>
          </div>
        </div>

        {session ? (
          <AcceptInviteForm token={token} />
        ) : (
          <LoginCTA token={token} />
        )}
      </div>
    </main>
  );
}

function InviteError({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/30">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link
          href={cta?.href ?? "/login"}
          className="text-sm text-primary underline underline-offset-4"
        >
          {cta?.label ?? "Voltar ao início"}
        </Link>
      </div>
    </main>
  );
}
