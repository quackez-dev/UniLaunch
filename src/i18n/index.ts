import { en } from "./en";
import { fr, type MessageKey } from "./fr";

export type Language = "fr" | "en";
export type { MessageKey };

const dictionaries: Record<Language, Record<MessageKey, string>> = { fr, en };

export type Params = Record<string, string | number>;

/** Traduit une clé et remplace les `{param}`. */
export function translate(lang: Language, key: MessageKey, params?: Params): string {
  const text = dictionaries[lang]?.[key] ?? fr[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
