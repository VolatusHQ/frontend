/**
 * Account identity and display preferences for the Profile experience.
 *
 * No backend, no chain, no wallet connection: the address below is a fixed
 * mock the whole prototype shares, and the preferences persist to
 * localStorage only. Nothing here is portfolio data — every figure Profile
 * shows is derived live from the domain contexts (see `portfolio.ts`).
 */

/**
 * The connected wallet. Rendered through `addr()` in `format.ts`
 * (`0x7a4e…a82f`); the wallet is assumed connected for the prototype.
 */
export const WALLET_ADDRESS = "0x7a4e2b9c1f3d5a8e6b04c2f19d7e3a5b0c93a82f";

/** localStorage key for the Settings page's view preferences. */
export const SETTINGS_STORAGE_KEY = "volatus.profile.settings";

export type ProfileSettings = {
  /** Show large figures as $42.8M rather than $42,800,000. */
  compactCurrency: boolean;
  /** Default share of a position to pre-select when starting protection. */
  defaultCoveragePct: 0.25 | 0.5 | 0.75 | 1;
  /** Prototype notification toggles — display only, nothing is sent. */
  notifyVolatility: boolean;
  notifyProtectionLapse: boolean;
  notifySettlement: boolean;
};

export const SETTINGS_DEFAULTS: ProfileSettings = {
  compactCurrency: false,
  defaultCoveragePct: 0.5,
  notifyVolatility: true,
  notifyProtectionLapse: true,
  notifySettlement: false,
};

/*
 * A tiny external store so the Settings page can read localStorage through
 * `useSyncExternalStore` — SSR-safe, and the snapshot is referentially
 * stable between reads (required by the hook) because it is cached here and
 * only replaced on `setSettings`.
 */

let cache: ProfileSettings | null = null;
const listeners = new Set<() => void>();

function load(): ProfileSettings {
  if (typeof window === "undefined") return SETTINGS_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return SETTINGS_DEFAULTS;
    return { ...SETTINGS_DEFAULTS, ...(JSON.parse(raw) as Partial<ProfileSettings>) };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

/** Client snapshot for `useSyncExternalStore`. Stable until `setSettings`. */
export function getSettings(): ProfileSettings {
  if (cache === null) cache = load();
  return cache;
}

/** Server / hydration snapshot for `useSyncExternalStore`. */
export function getServerSettings(): ProfileSettings {
  return SETTINGS_DEFAULTS;
}

export function setSettings(next: ProfileSettings): void {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — the preference just doesn't persist */
    }
  }
  listeners.forEach((l) => l());
}

export function subscribeSettings(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_STORAGE_KEY) {
      cache = load();
      callback();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
