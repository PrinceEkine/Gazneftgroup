import { Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type AdminUser } from "../lib/api";

/**
 * Cursor-paginated user browser. "Load more" walks Firebase Auth's pageToken
 * cursor, so memory and latency stay constant regardless of total user count.
 * Exact-email lookup covers the "find this specific user" admin workflow.
 */
export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<AdminUser | null | "none">(null);

  async function loadPage(token?: string) {
    setBusy(true);
    setError(null);
    try {
      const page = await api.listUsers(token);
      setUsers((existing) => (token ? [...existing, ...page.users] : page.users));
      setNextPageToken(page.nextPageToken);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) {
      setSearchResult(null);
      return;
    }
    try {
      const { user } = await api.lookupByEmail(query.trim());
      setSearchResult(user);
    } catch {
      setSearchResult("none");
    }
  }

  const rows = searchResult && searchResult !== "none" ? [searchResult] : users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold">Users</h2>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setSearchResult(null);
            }}
            placeholder="Find by exact email…"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64"
          />
          <button
            type="submit"
            className="rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-700"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {searchResult === "none" && (
        <p className="text-sm text-slate-500">No user with that email.</p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.uid} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/users/${user.uid}`} className="text-sky-600 hover:underline">
                    {user.email ?? user.uid}
                  </Link>
                  {user.displayName && (
                    <span className="text-slate-400 ml-2">{user.displayName}</span>
                  )}
                  {user.isAdmin && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {user.disabled ? (
                    <span className="text-red-600">Disabled</span>
                  ) : (
                    <span className="text-emerald-600">Active</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!searchResult && nextPageToken && (
        <button
          onClick={() => loadPage(nextPageToken)}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
