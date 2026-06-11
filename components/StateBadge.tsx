import type { LegState, ContractState } from "@/lib/db/schema";

type AnyState = LegState | ContractState | string;

const MAP: Record<string, { label: string; cls: string; dot: string }> = {
  // leg states
  pending: { label: "Pending", cls: "text-text-muted bg-white/5", dot: "bg-text-muted" },
  window_open: { label: "Window Open", cls: "text-pending bg-pending-soft", dot: "bg-pending" },
  attested: { label: "Attested", cls: "text-info bg-[rgba(96,165,250,0.12)]", dot: "bg-info" },
  released: { label: "Releasing", cls: "text-success bg-success-soft", dot: "bg-success" },
  settled: { label: "Settled", cls: "text-success bg-success-soft", dot: "bg-success" },
  disputed: { label: "Disputed", cls: "text-danger bg-danger-soft", dot: "bg-danger" },
  refund_initiated: { label: "Refunding", cls: "text-danger bg-danger-soft", dot: "bg-danger" },
  refunded: { label: "Refunded", cls: "text-danger bg-danger-soft", dot: "bg-danger" },
  cancelled: { label: "Cancelled", cls: "text-text-muted bg-white/5", dot: "bg-text-muted" },
  // contract states
  draft: { label: "Draft", cls: "text-text-muted bg-white/5", dot: "bg-text-muted" },
  awaiting_payment: { label: "Awaiting Payment", cls: "text-pending bg-pending-soft", dot: "bg-pending" },
  funded: { label: "Funded", cls: "text-info bg-[rgba(96,165,250,0.12)]", dot: "bg-info" },
  active: { label: "Active", cls: "text-success bg-success-soft", dot: "bg-success" },
  completed: { label: "Completed", cls: "text-success bg-success-soft", dot: "bg-success" },
  partially_refunded: { label: "Partially Refunded", cls: "text-pending bg-pending-soft", dot: "bg-pending" },
  fully_refunded: { label: "Fully Refunded", cls: "text-danger bg-danger-soft", dot: "bg-danger" },
};

export function StateBadge({ state }: { state: AnyState }) {
  const s = MAP[state] ?? { label: state, cls: "text-text-muted bg-white/5", dot: "bg-text-muted" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
