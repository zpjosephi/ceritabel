"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { t as translate, type Lang } from "@/lib/i18n";

interface LangContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Bound translator for the current language. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangContext>({
  lang: "id",
  setLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "ceritabel-lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default Indonesian on both server & first client render (avoids hydration
  // mismatch); the saved preference is applied after mount.
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    // One-time sync of the saved preference after mount. We intentionally start
    // from "id" on the server + first client render to avoid a hydration
    // mismatch, then apply the stored choice here.
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "id" || saved === "en") setLangState(saved);
    } catch {
      /* ignore (private mode etc.) */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(lang, key, params),
    [lang],
  );

  return (
    <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}
