import { auth } from "./firebase";

/**
 * Thin fetch wrapper: attaches the signed-in admin's ID token and normalizes
 * errors. The API base defaults to same-origin (/api is proxied in dev).
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return response.json();
}

export interface AdminUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt?: string;
  lastSignInAt?: string;
}

export interface UserDetail {
  user: AdminUser;
  usage: {
    linkedAccounts: {
      id: string;
      email: string;
      provider: string;
      authType: string;
      lastSynced: string | null;
    }[];
    cachedMessages: number;
    templates: number;
    drafts: number;
  };
}

export interface Metrics {
  totalUsers: number;
  stats: Record<string, unknown>;
  recentAdminActions: {
    id: string;
    action: string;
    targetUid: string;
    actorEmail: string;
    at: string | null;
  }[];
}

export const api = {
  listUsers: (pageToken?: string) =>
    request<{ users: AdminUser[]; nextPageToken: string | null }>(
      `/api/users?limit=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`
    ),
  lookupByEmail: (email: string) =>
    request<{ user: AdminUser }>(`/api/users/lookup?email=${encodeURIComponent(email)}`),
  getUser: (uid: string) => request<UserDetail>(`/api/users/${uid}`),
  disableUser: (uid: string) => request(`/api/users/${uid}/disable`, { method: "POST" }),
  enableUser: (uid: string) => request(`/api/users/${uid}/enable`, { method: "POST" }),
  setAdmin: (uid: string, admin: boolean) =>
    request(`/api/users/${uid}/admin`, { method: "POST", body: JSON.stringify({ admin }) }),
  deleteUser: (uid: string) => request(`/api/users/${uid}`, { method: "DELETE" }),
  metrics: () => request<Metrics>(`/api/metrics`),
};
