import { useEffect, useState } from "react";
import { useLanguage } from "./useLanguage";

export function useAutoTranslate() {
  const { language, translateContent } = useLanguage();
  const [translatedCache, setTranslatedCache] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Clear cache when language changes to force re-translation
    setTranslatedCache(new Map());
  }, [language]);

  const translateIfNeeded = async (text: string): Promise<string> => {
    if (!text || language === "en") return text;

    // Check cache first
    if (translatedCache.has(text)) {
      return translatedCache.get(text)!;
    }

    // Translate
    const translated = await translateContent(text, language);
    
    // Update cache
    setTranslatedCache((prev) => new Map(prev).set(text, translated));
    
    return translated;
  };

  return { translateIfNeeded, language };
}
