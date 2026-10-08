import { useEffect, useState } from "react";
import { api, type Metrics } from "../lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.metrics().then(setMetrics).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!metrics) return <p className="text-sm text-slate-500">Loading metrics…</p>;

  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Registered users" value={metrics.totalUsers.toLocaleString()} />
      </div>

      <section>
        <h3 className="font-semibold mb-3">Recent admin actions</h3>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Target user</th>
                <th className="px-4 py-2 font-medium">By</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentAdminActions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No admin actions recorded yet.
                  </td>
                </tr>
              )}
              {metrics.recentAdminActions.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{entry.action}</td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.targetUid}</td>
                  <td className="px-4 py-2">{entry.actorEmail}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {entry.at ? new Date(entry.at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
