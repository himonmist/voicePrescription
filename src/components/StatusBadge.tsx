import { STATUS_LABEL, type IntegrationStatusKey } from "@/lib/ai/catalog/types";

const TONE: Record<string, string> = {
  IN_APP: "bg-teal-50 text-teal-700 ring-teal-200", BETA: "bg-violet-50 text-violet-700 ring-violet-200",
  EXTERNAL: "bg-slate-100 text-slate-700 ring-slate-200", DISABLED: "bg-rose-50 text-rose-700 ring-rose-200",
  UNAVAILABLE: "bg-amber-50 text-amber-800 ring-amber-200",
};
export function StatusBadge({ status }: { status: IntegrationStatusKey }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONE[status] ?? "bg-amber-50 text-amber-800 ring-amber-200"}`}>{STATUS_LABEL[status]}</span>;
}
