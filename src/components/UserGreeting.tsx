"use client";

interface UserGreetingProps {
  name: string;
}

function getGreetingLabel() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default function UserGreeting({ name }: UserGreetingProps) {
  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl border border-primary/15 bg-card px-4 py-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_30%)]" />
      <div className="relative min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {getGreetingLabel()}
        </p>
        <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">
          Hi, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s keep today steady and intentional.
        </p>
      </div>
    </div>
  );
}
