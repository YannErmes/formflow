import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/useLanguage";

export function useCachedTranslation(text: string | null | undefined) {
  const { language, translateContent } = useLanguage();
  const [translated, setTranslated] = useState(text || "");

  useEffect(() => {
    if (!text) {
      setTranslated("");
      return;
    }

    if (language === "en") {
      setTranslated(text);
      return;
    }

    // Translate asynchronously
    const doTranslate = async () => {
      const result = await translateContent(text, language);
      setTranslated(result);
    };

    doTranslate();
  }, [text, language, translateContent]);

  return translated;
}
