import { getToken } from "./auth";
import type { AppConfig, Manifest } from "./types";

const API = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

function headers(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export interface Point {
  t: string;
  value: number;
}

export class AuthError extends Error {}

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch(`${API}/api/config`, { headers: headers() });
  if (res.status === 401) throw new AuthError("unauthorized");
  if (!res.ok) throw new Error(`config ${res.status}`);
  return (await res.json()) as AppConfig;
}

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(`${API}/api/manifest`, { headers: headers() });
  if (res.status === 401) throw new AuthError("unauthorized");
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return (await res.json()) as Manifest;
}

// Never fabricates: returns the real governed points, or an empty array.
export async function fetchSeries(tag: string, windowDays: number): Promise<Point[]> {
  const url = `${API}/api/series?tag=${encodeURIComponent(tag)}&window_days=${windowDays}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return [];
  return ((await res.json()).points ?? []) as Point[];
}
