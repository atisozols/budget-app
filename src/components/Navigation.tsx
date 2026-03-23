"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  PlusCircle,
  LayoutDashboard,
  Repeat,
  Calculator,
  Settings,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: PlusCircle, label: "Add" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/recurring", icon: Repeat, label: "Recurring" },
  { href: "/taxes", icon: Calculator, label: "Taxes" },
  { href: "/categories", icon: Tag, label: "Categories" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
