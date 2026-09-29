export const dynamic = "force-dynamic";
export default function Usage() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-2xl font-bold">AI Usage and Credits</h1>
      <p className="rounded-2xl bg-white p-5 shadow-card text-slate-600">Usage is read from your billing records via <code>/api/ai/usage/summary</code>. No figures are shown until real usage exists. Costs are estimates until reconciled with provider-reported usage.</p>
    </div>
  );
}
