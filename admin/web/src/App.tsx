import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { LayoutDashboard, LogOut, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { auth } from "./lib/firebase";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import UserDetailPage from "./pages/UserDetailPage";
import UsersPage from "./pages/UsersPage";

/**
 * Auth gate: a session is only "admin" when the ID token carries the
 * admin=true custom claim. Anyone else — even a valid GNmail user — sees the
 * access-denied screen. (The API enforces the same claim server-side; this
 * gate is UX, not security.)
 */
export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        return;
      }
      const token = await nextUser.getIdTokenResult();
      setUser(nextUser);
      setIsAdmin(token.claims.admin === true);
    });
  }, []);

  if (user === undefined) {
    return <Centered>Loading…</Centered>;
  }
  if (!user) {
    return <LoginPage />;
  }
  if (!isAdmin) {
    return (
      <Centered>
        <div className="text-center space-y-3">
          <p className="font-semibold">Access denied</p>
          <p className="text-sm text-slate-500">
            {user.email} is not an administrator of GNmail.
          </p>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-sky-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar email={user.email ?? ""} />
      <main className="flex-1 p-8 overflow-x-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:uid" element={<UserDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Sidebar({ email }: { email: string }) {
  const { pathname } = useLocation();
  const linkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
      active ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4 flex flex-col">
      <div className="mb-6 px-2">
        <h1 className="text-lg font-bold text-sky-600">GNmail Admin</h1>
        <p className="text-xs text-slate-400 truncate">{email}</p>
      </div>
      <nav className="space-y-1 flex-1">
        <Link to="/" className={linkClass(pathname === "/")}>
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        <Link to="/users" className={linkClass(pathname.startsWith("/users"))}>
          <Users size={16} /> Users
        </Link>
      </nav>
      <button
        onClick={() => signOut(auth)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-200"
      >
        <LogOut size={16} /> Sign out
      </button>
    </aside>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center">{children}</div>;
}
