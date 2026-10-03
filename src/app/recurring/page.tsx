import PlanView from "@/components/PlanView";

// Bills now live under Plan; this keeps old links and the PWA shortcut working.
export default function RecurringPage() {
  return <PlanView initialTab="bills" />;
}
