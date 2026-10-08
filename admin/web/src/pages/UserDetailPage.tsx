import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type UserDetail } from "../lib/api";

export default function UserDetailPage() {
  const { uid = "" } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    api.getUser(uid).then(setDetail).catch((e) => setError(e.message));
  }, [uid]);

  useEffect(refresh, [refresh]);

  async function run(action: () => Promise<unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !detail) return <p className="text-sm text-red-600">{error}</p>;
  if (!detail) return <p className="text-sm text-slate-500">Loading…</p>;

  const { user, usage } = detail;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/users" className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
        <ArrowLeft size={14} /> All users
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">{user.email ?? user.uid}</h2>
            <p className="text-sm text-slate-500">
              {user.displayName ?? "No display name"} · <span className="font-mono text-xs">{user.uid}</span>
            </p>
            <p className="text-sm mt-1">
              {user.disabled ? (
                <span className="text-red-600 font-medium">Disabled</span>
              ) : (
                <span className="text-emerald-600 font-medium">Active</span>
              )}
              {user.isAdmin && <span className="ml-2 text-amber-600">Administrator</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {user.disabled ? (
              <ActionButton onClick={() => run(() => api.enableUser(user.uid))} disabled={busy}>
                Enable
              </ActionButton>
            ) : (
              <ActionButton
                onClick={() =>
                  run(
                    () => api.disableUser(user.uid),
                    `Disable ${user.email}? They will be signed out everywhere immediately.`
                  )
                }
                disabled={busy}
              >
                Disable
              </ActionButton>
            )}
            <ActionButton
              onClick={() =>
                run(
                  () => api.setAdmin(user.uid, !user.isAdmin),
                  user.isAdmin
                    ? `Revoke admin from ${user.email}?`
                    : `Grant FULL admin access to ${user.email}?`
                )
              }
              disabled={busy}
            >
              {user.isAdmin ? "Revoke admin" : "Make admin"}
            </ActionButton>
            <ActionButton
              danger
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.deleteUser(user.uid);
                  navigate("/users");
                }, `PERMANENTLY delete ${user.email} and ALL their data (accounts, cached mail, templates, drafts)? This cannot be undone.`)
              }
            >
              Delete user
            </ActionButton>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-4">
          <Stat label="Linked accounts" value={usage.linkedAccounts.length} />
          <Stat label="Cached messages" value={usage.cachedMessages} />
          <Stat label="Templates" value={usage.templates} />
          <Stat label="Drafts" value={usage.drafts} />
        </dl>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <h3 className="px-4 py-3 font-semibold border-b border-slate-100">Linked email accounts</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Address</th>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Auth</th>
              <th className="px-4 py-2 font-medium">Last synced</th>
            </tr>
          </thead>
          <tbody>
            {usage.linkedAccounts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No linked email accounts.
                </td>
              </tr>
            )}
            {usage.linkedAccounts.map((account) => (
              <tr key={account.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{account.email}</td>
                <td className="px-4 py-2 capitalize">{account.provider}</td>
                <td className="px-4 py-2">{account.authType}</td>
                <td className="px-4 py-2 text-slate-500">
                  {account.lastSynced ? new Date(account.lastSynced).toLocaleString() : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        danger
          ? "bg-red-600 text-white hover:bg-red-700"
          : "border border-slate-300 bg-white hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}
