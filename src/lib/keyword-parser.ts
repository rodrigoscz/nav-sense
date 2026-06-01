// Parse the target keywords / entities. Two shapes:
//   1. One per line. Optional volume after a pipe or tab: "seo audit | 1200"
//   2. JSON: [{ term, volume? }] or ["term", "term"]
// Volume is the demand signal. When absent it defaults to 0 and we rank by
// match quality instead. Volume never gets invented: no key, no number.

export interface Keyword {
  term: string;
  volume: number; // 0 when unknown
}

export class KeywordParseError extends Error {}

function parseLine(line: string): Keyword | null {
  const trimmed = line.trim();
  if (trimmed === "") return null;
  // Accept "term | 1200", "term\t1200", "term, 1200" as term + volume.
  const match = trimmed.match(/^(.*?)[\s]*[|\t,][\s]*(\d[\d.,]*)\s*$/u);
  if (match) {
    const term = match[1].trim();
    const volume = Number(match[2].replace(/[.,]/g, ""));
    return { term, volume: Number.isFinite(volume) ? volume : 0 };
  }
  return { term: trimmed, volume: 0 };
}

export function parseKeywords(input: string): Keyword[] {
  const trimmed = input.trim();
  if (trimmed === "") throw new KeywordParseError("La lista de keywords está vacía.");

  if (trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new KeywordParseError("Parece JSON pero no se pudo parsear.");
    }
    if (!Array.isArray(parsed)) {
      throw new KeywordParseError("JSON inválido. Esperaba un array.");
    }
    const out: Keyword[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string") {
        if (entry.trim()) out.push({ term: entry.trim(), volume: 0 });
      } else if (entry && typeof entry === "object" && "term" in entry) {
        const e = entry as { term: unknown; volume?: unknown };
        if (typeof e.term === "string" && e.term.trim()) {
          const volume = typeof e.volume === "number" && Number.isFinite(e.volume) ? e.volume : 0;
          out.push({ term: e.term.trim(), volume });
        }
      }
    }
    if (out.length === 0) {
      throw new KeywordParseError('JSON sin keywords válidas. Forma: [{ "term": "...", "volume": 0 }].');
    }
    return dedupe(out);
  }

  const out: Keyword[] = [];
  for (const line of trimmed.split("\n")) {
    const kw = parseLine(line);
    if (kw && kw.term) out.push(kw);
  }
  if (out.length === 0) throw new KeywordParseError("No encontré keywords en la lista.");
  return dedupe(out);
}

// Same term twice keeps the higher volume.
function dedupe(keywords: Keyword[]): Keyword[] {
  const byTerm = new Map<string, Keyword>();
  for (const kw of keywords) {
    const key = kw.term.toLowerCase();
    const prev = byTerm.get(key);
    if (!prev || kw.volume > prev.volume) byTerm.set(key, kw);
  }
  return [...byTerm.values()];
}

export function anyVolume(keywords: Keyword[]): boolean {
  return keywords.some((k) => k.volume > 0);
}
