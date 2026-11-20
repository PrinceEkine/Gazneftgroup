import { auth } from "./firebase";

/**
 * Thin fetch wrapper: attaches the signed-in admin's ID token and normalizes
 * errors. The API base defaults to same-origin (/api is proxied in dev).
 */
async function request(path, init = {}) {
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

export const api = {
  listUsers: (pageToken) =>
    request(
      `/api/users?limit=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`
    ),
  lookupByEmail: (email) =>
    request(`/api/users/lookup?email=${encodeURIComponent(email)}`),
  getUser: (uid) => request(`/api/users/${uid}`),
  disableUser: (uid) => request(`/api/users/${uid}/disable`, { method: "POST" }),
  enableUser: (uid) => request(`/api/users/${uid}/enable`, { method: "POST" }),
  setAdmin: (uid, admin) =>
    request(`/api/users/${uid}/admin`, { method: "POST", body: JSON.stringify({ admin }) }),
  deleteUser: (uid) => request(`/api/users/${uid}`, { method: "DELETE" }),
  metrics: () => request(`/api/metrics`),
};
