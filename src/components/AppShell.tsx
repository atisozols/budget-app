"use client";

import { usePathname } from "next/navigation";
import { MonthProvider } from "@/lib/MonthContext";
import { AppDataProvider } from "@/lib/AppDataContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import LoadingGate from "@/components/LoadingGate";
import Navigation from "@/components/Navigation";
import UndoToast from "@/components/UndoToast";

const BARE_PATHS = ["/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFloatingAdd = pathname !== "/settings";

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
            <main
              className="flex-1"
              style={{
                paddingBottom: showFloatingAdd
                  ? "calc(env(safe-area-inset-bottom, 0px) + 10rem)"
                  : "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
              }}
            >
              {children}
            </main>
          </div>
          <UndoToast />
          <Navigation />
        </LoadingGate>
      </AppDataProvider>
    </MonthProvider>
  );
}
