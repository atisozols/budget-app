"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { MonthProvider } from "@/lib/MonthContext";
import { AppDataProvider } from "@/lib/AppDataContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import LoadingGate from "@/components/LoadingGate";
import MonthSwitcher from "@/components/MonthSwitcher";
import Navigation from "@/components/Navigation";
import type { SessionUser } from "@/lib/auth";

const BARE_PATHS = ["/login"];

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  if (BARE_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <MonthProvider>
      <AppDataProvider>
        <ServiceWorkerRegister />
        <LoadingGate>
          <div
            className="max-w-lg mx-auto w-full px-4"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
            }}
          >
            {user ? (
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-3 py-2 backdrop-blur">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Signed In
                  </p>
                  <p className="truncate text-sm font-medium">{user.name}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {loggingOut ? "Signing out..." : "Log out"}
                </button>
              </div>
            ) : null}
            <MonthSwitcher />
            <main className="flex-1 pb-28">{children}</main>
          </div>
          <Navigation />
        </LoadingGate>
      </AppDataProvider>
    </MonthProvider>
  );
}
