/**
 * The page's calls: auth's sign-in (its own session, kept apart from the website's so neither refreshes the other's) and
 * the backend's /ops/v1, at the company's services for the page's origin: www's at api.cameyware.com, the preview's at
 * its /api (as the website finds them), any other at its own (NEXT_PUBLIC_API_ROOT for this computer).
 */
import addresses from "../generated/addresses.json";

export const servicesRoot = (origin: string) =>
  origin === addresses.company.site
    ? addresses.company.server
    : origin === addresses.company.preview
      ? addresses.company.previewApi
      : (process.env.NEXT_PUBLIC_API_ROOT ?? origin);

const root = () => servicesRoot(window.location.origin).replace(/\/+$/, "");

interface Tokens {
  access_token: string;
  refresh_token: string;
}

const KEY = "cameyware-build-monitor.session";
const listeners = new Set<() => void>();

/** The page's own session, in this browser alone; every change told to the page. */
export const session = {
  get(): Tokens | undefined {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Tokens) : undefined;
    } catch {
      return undefined;
    }
  },
  set(t: Tokens | undefined) {
    try {
      if (t) localStorage.setItem(KEY, JSON.stringify(t));
      else localStorage.removeItem(KEY);
    } catch {
      // storage off: signed in for this page's life alone
    }
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${root()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { title?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, json.title ?? `HTTP ${res.status}`, json.code);
  return json as T;
}

/** Signed in with a login (username, email or phone) and password, as the website's staff sign in. */
export async function signIn(login: string, password: string) {
  session.set(await post<Tokens>("/auth/v1/login", { login, password, client: "web" }));
}

/**
 * Opened from the CMS's menu (禄命秘解 S77; the owner, 2026-11-26: 「如果用户登录admin了，可以直接登录部署监控，无需再登录了」):
 * its one-time code (?code=…) redeemed for this page's own session, then taken out of the address. A code used or late
 * leaves the sign-in form.
 */
export async function takeHandoff() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!code) return;
  url.searchParams.delete("code");
  window.history.replaceState(null, "", url.toString());
  try {
    session.set(await post<Tokens>("/auth/v1/handoff/redeem", { code }));
  } catch {
    // used or late: sign in as usual
  }
}

let refreshing: Promise<boolean> | undefined;
/** A new pair for the old, once at a time; false (and signed out) when the session has ended. */
function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const t = session.get();
    try {
      if (!t) return false;
      session.set(await post<Tokens>("/auth/v1/refresh", { refresh_token: t.refresh_token }));
      return true;
    } catch {
      session.set(undefined);
      return false;
    } finally {
      refreshing = undefined;
    }
  })();
  return refreshing;
}

/** GET /ops/v1[path] as the signed-in reader; an ended session signs out. */
export async function ops<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = session.get();
    if (!t) throw new ApiError(401, "signed out");
    const res = await fetch(`${root()}/ops/v1${path}`, {
      headers: { authorization: `Bearer ${t.access_token}` },
    });
    if (res.status === 401 && attempt === 0 && (await refresh())) continue;
    const json = (await res.json().catch(() => ({}))) as T & { title?: string; code?: string };
    if (!res.ok) {
      if (res.status === 401) session.set(undefined);
      throw new ApiError(res.status, json.title ?? `HTTP ${res.status}`, json.code);
    }
    return json;
  }
  throw new ApiError(401, "signed out");
}
