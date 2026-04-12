import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Language, TranslationKey, translations } from "./translations";
import { toast } from "sonner";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  translateContent: (text: string, targetLanguage?: Language) => Promise<string>;
  getTranslatedText: (originalText: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation cache to store translated content
const translationCache = new Map<string, Map<Language, string>>();

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("formflow_language") as Language;
    return saved || "en";
  });

  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem("formflow_language", language);
    // Set document language
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    const langName = translations.en[`${lang}` as TranslationKey] || lang;
    toast.info(`Language changed to ${langName}`);
  }, []);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  const translateContent = async (text: string, targetLanguage?: Language): Promise<string> => {
    try {
      const lang = targetLanguage || language;
      if (lang === "en" || !text || text.trim().length === 0) return text;

      // Check cache first
      if (translationCache.has(text)) {
        const cached = translationCache.get(text);
        if (cached?.has(lang)) {
          return cached.get(lang)!;
        }
      }

      const langCode = lang.slice(0, 2);
      
      // Use LibreTranslate API (free, no API key needed)
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        body: JSON.stringify({
          q: text,
          source: "en",
          target: langCode,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn("Translation API failed, returning original text");
        return text;
      }

      const data = await response.json();
      const translated = data.translatedText || text;

      // Cache the translation
      if (!translationCache.has(text)) {
        translationCache.set(text, new Map());
      }
      translationCache.get(text)!.set(lang, translated);

      return translated;
    } catch (error) {
      console.warn("Translation error:", error);
      return text;
    }
  };

  const getTranslatedText = (originalText: string): string => {
    if (language === "en" || !originalText) return originalText;
    
    if (translationCache.has(originalText)) {
      const cached = translationCache.get(originalText);
      if (cached?.has(language)) {
        return cached.get(language)!;
      }
    }
    
    return originalText;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateContent, getTranslatedText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
