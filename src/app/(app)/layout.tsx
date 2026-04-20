import { Suspense, type ReactNode } from "react";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ToastFromQuery } from "@/components/toast-from-query";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireHouseholdContext();

  return (
    <div className="flex min-h-dvh flex-col">
      {children}
      <BottomNav />
      <Suspense fallback={null}>
        <ToastFromQuery />
      </Suspense>
    </div>
  );
}
