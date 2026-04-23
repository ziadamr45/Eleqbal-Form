"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import { translations, type Language } from "./translations";

type TranslationDict = typeof translations.ar;

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationDict;
  dir: "rtl" | "ltr";
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "lang";
const DEFAULT_LANGUAGE: Language = "ar";

function getDirection(lang: Language): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

function readStorage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    // localStorage may be unavailable
  }
  return DEFAULT_LANGUAGE;
}

function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

function applyLanguageToDocument(lang: Language) {
  const dir = getDirection(lang);
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readStorage, getServerSnapshot);

  const setLang = useCallback((newLang: Language) => {
    applyLanguageToDocument(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // Silently fail
    }
    emitChange();
  }, []);

  const dir = useMemo(() => getDirection(lang), [lang]);
  const isRTL = dir === "rtl";
  const t = useMemo(() => translations[lang], [lang]);

  useMemo(() => {
    if (typeof document !== "undefined") {
      applyLanguageToDocument(lang);
    }
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t, dir, isRTL }),
    [lang, setLang, t, dir, isRTL]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Helper to get nested translation value
export function getT(lang: Language) {
  const dict = translations[lang];
  return function (key: string): string {
    const keys = key.split(".");
    let result: unknown = dict;
    for (const k of keys) {
      if (result && typeof result === "object") {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof result === "string" ? result : key;
  };
}
