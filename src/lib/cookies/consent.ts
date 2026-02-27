// src/lib/cookies/consent.ts

export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  version: string;
  timestamp: number;
};

export const CONSENT_VERSION = "1.0";
const COOKIE_NAME = "cookie_preferences";


// Obtener consentimiento desde cookies
export function getStoredConsent(): CookiePreferences | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");

  const consentCookie = cookies.find((row) =>
    row.startsWith(`${COOKIE_NAME}=`)
  );

  if (!consentCookie) return null;

  try {
    const value = decodeURIComponent(consentCookie.split("=")[1]);
    return JSON.parse(value);
  } catch {
    return null;
  }
}


// Guardar consentimiento SOLO si hay opcionales
export function saveConsent(preferences: CookiePreferences) {
  const hasOptionalConsent =
    preferences.analytics ||
    preferences.marketing ||
    preferences.functional;

  if (hasOptionalConsent) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify(preferences)
    )}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    // Si solo necesarias → eliminar cookie
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}