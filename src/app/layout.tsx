import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import MonthSwitcher from "@/components/MonthSwitcher";
import { MonthProvider } from "@/lib/MonthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Budget Flow",
  description: "Personal budgeting app with tax tracking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Budget Flow",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      style={{ minHeight: "100dvh" }}
    >
      <body
        className="flex flex-col bg-background text-foreground"
        style={{ minHeight: "100dvh" }}
      >
        <MonthProvider>
          <ServiceWorkerRegister />
          <div
            className="max-w-lg mx-auto w-full px-4"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
            }}
          >
            <MonthSwitcher />
            <main className="flex-1 pb-28">{children}</main>
          </div>
          <Navigation />
        </MonthProvider>
      </body>
    </html>
  );
}
