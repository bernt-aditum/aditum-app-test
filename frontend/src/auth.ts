// Aditum SSO for the deployed app. Mirrors the platform's proven flow: redirect
// to Aditum login, capture the returned token from the URL, attach it as a
// Bearer to the app's own backend. No secret ever lives in the browser.

const KEY = "aditum_app_token";
const ADITUM_LOGIN = (import.meta.env.VITE_ADITUM_LOGIN || "https://aditumdata.com").replace(/\/$/, "");

export function captureTokenFromUrl(): void {
  const q = new URLSearchParams(window.location.search).get("token");
  let token = q;
  if (!token && window.location.hash.includes("token=")) {
    token = new URLSearchParams(window.location.hash.slice(1)).get("token");
  }
  if (token) {
    localStorage.setItem(KEY, token);
    window.history.replaceState({}, "", window.location.pathname);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}

export function signIn(): void {
  const next = window.location.origin;
  window.location.href = `${ADITUM_LOGIN}/api/auth/google/login?next=${encodeURIComponent(next)}`;
}

export function signOut(): void {
  localStorage.removeItem(KEY);
  window.location.reload();
}
