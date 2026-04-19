import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
          <span className="text-3xl font-bold text-primary">F</span>
        </div>
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Fincasa</h1>
          <p className="text-sm text-muted-foreground">
            Organize as finanças de casa, em família.
          </p>
        </div>
      </div>

      <LoginForm />

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Ao entrar, você concorda em usar o Fincasa para controle financeiro
        familiar. Seus dados ficam no seu projeto Firebase.
      </p>
    </div>
  );
}
