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

// Score bands. There is no universal answer to "how similar is similar
// enough", so the cutoffs are parameters, not constants. These defaults are
// tuned so a clear head-term match lands STRONG and a thematic overlap lands
// WEAK, but the user owns the dial (see the sliders in the UI).
export interface Thresholds {
  strong: number;
  weak: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  strong: 0.6,
  weak: 0.3,
};

// Keep a clamped, coherent pair: both inside [0,1] and weak <= strong, so a
// bad slider combination can never invert the bands.
export function normalizeThresholds(t: Thresholds): Thresholds {
  const clamp = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
  const strong = clamp(t.strong);
  const weak = Math.min(clamp(t.weak), strong);
  return { strong, weak };
}

export type Band = "strong" | "weak" | "none";

export function bandOf(score: number, thresholds: Thresholds = DEFAULT_THRESHOLDS): Band {
  if (score >= thresholds.strong) return "strong";
  if (score >= thresholds.weak) return "weak";
  return "none";
}
