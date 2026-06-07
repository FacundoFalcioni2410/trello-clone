const API_BASE = "http://localhost:8000";

export function getXsrfToken(): string | null {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getCsrfCookie() {
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: "include",
  });
}

export function extractErrorMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "Request failed";

  const p = payload as Record<string, unknown>;

  if (p.errors && typeof p.errors === "object") {
    const messages = Object.values(p.errors)
      .flat()
      .filter((m): m is string => typeof m === "string");
    if (messages.length > 0) return messages.join(". ");
  }

  if (typeof p.message === "string" && p.message) return p.message;
  if (typeof p.error === "string" && p.error) return p.error;

  return `Request failed with status ${p.status ?? ""}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getXsrfToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { "X-XSRF-TOKEN": token } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body ? extractErrorMessage(body) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}
