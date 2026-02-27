"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  CookiePreferences,
  getStoredConsent,
  saveConsent,
  CONSENT_VERSION,
} from "@/lib/cookies/consent";

type ContextType = {
  consent: CookiePreferences | null;
  setConsent: (prefs: CookiePreferences) => void;
  resetConsent: () => void;
};

const CookieContext = createContext<ContextType | undefined>(undefined);

export function CookieProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored && stored.version === CONSENT_VERSION) {
      setConsentState(stored);
    }
  }, []);

  const setConsent = (prefs: CookiePreferences) => {
    saveConsent(prefs);
    setConsentState(prefs);
  };

  const resetConsent = () => {
    localStorage.removeItem("cookie_preferences");
    setConsentState(null);
  };

  return (
    <CookieContext.Provider value={{ consent, setConsent, resetConsent }}>
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieContext);
  if (!context) {
    throw new Error("useCookieConsent must be used inside CookieProvider");
  }
  return context;
}