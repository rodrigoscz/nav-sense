import { tokenSet } from "./tokenize";

// Similarity between a nav label and a keyword.
// We score in the keyword's favor: "how much of the keyword's intent does
// this label cover?" A short label that nails the keyword's head term should
// score high even if the keyword has extra modifiers.

export interface Scored<T> {
  item: T;
  score: number;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

// 0..1. Weighted blend of keyword coverage and label precision.
export function similarity(label: string, keyword: string): number {
  const l = tokenSet(label);
  const k = tokenSet(keyword);
  if (l.size === 0 || k.size === 0) return 0;
  const shared = intersectionSize(l, k);
  if (shared === 0) return 0;
  const keywordCoverage = shared / k.size; // how much of the query the label answers
  const labelPrecision = shared / l.size; // how focused the label is on it
  // Coverage matters more: a label that answers the query but adds noise is
  // still useful. Precision is the tie-breaker.
  return keywordCoverage * 0.7 + labelPrecision * 0.3;
}

// Rank a list of candidates against one target string.
export function rank<T>(
  target: string,
  candidates: T[],
  toText: (c: T) => string,
): Scored<T>[] {
  return candidates
    .map((item) => ({ item, score: similarity(target, toText(item)) }))
    .sort((a, b) => b.score - a.score);
}

// Score bands. Tuned so a clear head-term match lands STRONG, a partial
// thematic overlap lands WEAK, and noise stays NONE.
export const BAND = {
  STRONG: 0.6,
  WEAK: 0.3,
} as const;

export type Band = "strong" | "weak" | "none";

export function bandOf(score: number): Band {
  if (score >= BAND.STRONG) return "strong";
  if (score >= BAND.WEAK) return "weak";
  return "none";
}
