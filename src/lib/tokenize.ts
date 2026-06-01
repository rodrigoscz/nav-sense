// Tokenizer for nav labels and search keywords.
// Goal: turn human text into comparable term sets, in Spanish and English,
// so "Soluciones" and "solucion" or "Pricing" and "prices" line up.

const STOPWORDS = new Set([
  // Spanish
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al",
  "y", "o", "u", "en", "con", "por", "para", "a", "que", "se", "su", "sus",
  "lo", "mas", "muy", "tu", "mi", "nuestro", "nuestra",
  // English
  "the", "a", "an", "of", "and", "or", "in", "on", "for", "to", "with",
  "your", "our", "my", "this", "that", "is", "are", "be",
]);

// Generic nav words that almost never carry search intent on their own.
// A label made only of these is a candidate for "ambiguous".
export const VAGUE_TERMS = new Set([
  "recurso", "recursos", "solucion", "soluciones", "producto", "productos",
  "servicio", "servicios", "info", "informacion", "mas", "extra", "otros",
  "general", "varios", "contenido", "contenidos", "seccion", "secciones",
  "resource", "resources", "solution", "solutions", "product", "products",
  "service", "services", "stuff", "other", "others", "more", "misc",
]);

export function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Light stemmer. Not Porter-grade, on purpose: it folds the plurals and
// common suffixes that break naive matching, and stops there.
export function stem(word: string): string {
  let w = word;
  if (w.length > 5) {
    w = w
      // Collapse derivational suffixes so singular and plural land on one stem:
      // integracion / integraciones -> integra.
      .replace(/(ciones|cion|siones|sion|ciento|mente|mientos|miento)$/u, "")
      .replace(/(ables|ibles|able|ible)$/u, "");
  }
  if (w.length > 4) {
    w = w.replace(/(ando|iendo|ador|adora|aje|ería|eria)$/u, "");
  }
  // Plural folding (es / s) once the suffixes are gone.
  if (w.length > 4 && /(ces)$/u.test(w)) w = w.replace(/ces$/u, "z");
  else if (w.length > 4 && /(es)$/u.test(w)) w = w.replace(/es$/u, "");
  else if (w.length > 3 && /s$/u.test(w)) w = w.replace(/s$/u, "");
  return w;
}

export function tokenize(input: string): string[] {
  const cleaned = stripAccents(input.toLowerCase());
  const raw = cleaned.split(/[^a-z0-9]+/u).filter(Boolean);
  const out: string[] = [];
  for (const tok of raw) {
    if (STOPWORDS.has(tok)) continue;
    if (tok.length < 2) continue;
    out.push(stem(tok));
  }
  return out;
}

// A token set is the comparable unit. Empty input yields an empty set.
export function tokenSet(input: string): Set<string> {
  return new Set(tokenize(input));
}

// Does the label read as vague (only generic nav filler)?
export function isVagueLabel(label: string): boolean {
  const toks = tokenize(label);
  if (toks.length === 0) return true;
  return toks.every((t) => VAGUE_TERMS.has(t));
}
