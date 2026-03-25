"use client";

import { usePathname } from "next/navigation";
import { MonthProvider } from "@/lib/MonthContext";
import { AppDataProvider } from "@/lib/AppDataContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import LoadingGate from "@/components/LoadingGate";
import MonthSwitcher from "@/components/MonthSwitcher";
import Navigation from "@/components/Navigation";
import UserGreeting from "@/components/UserGreeting";
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

  if (BARE_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

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
            {user && pathname === "/" ? (
              <UserGreeting name={user.name} />
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
