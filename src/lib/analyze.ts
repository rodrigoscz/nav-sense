import { flatten, parseMenu, type FlatLabel, type NavNode } from "./menu-parser";
import { anyVolume, parseKeywords, type Keyword } from "./keyword-parser";
import {
  bandOf,
  DEFAULT_THRESHOLDS,
  normalizeThresholds,
  rank,
  similarity,
  type Band,
  type Thresholds,
} from "./similarity";
import { isVagueLabel } from "./tokenize";

// The gap engine. It compares how the navigation is built against how the
// demand actually reads, and names the mismatches. This is the part that
// proves the thesis: navigation is a language decision, not a taste call.

export type FindingKind =
  | "ghost-label" // label nobody searches for
  | "missing-demand" // demand with no home in the nav
  | "ambiguous-label" // label too vague to map cleanly
  | "misnested-label"; // label that belongs under another parent

export interface Finding {
  kind: FindingKind;
  label?: string; // the nav label involved (ghost / ambiguous / misnested)
  path?: string[]; // current location in the tree
  keyword?: string; // the demand involved (missing-demand)
  volume?: number;
  score: number; // best similarity tied to this finding
  band: Band;
  detail: string; // human explanation, Spanish
  suggestion: string; // what to do about it
  suggestedParent?: string; // for misnested / missing-demand
}

export interface AnalysisInput {
  menuText: string;
  keywordText: string;
  // Optional. The match cutoffs are the user's call, not ours. Defaults apply
  // when omitted, and get clamped/coerced before use.
  thresholds?: Thresholds;
}

export class EmptyMenuError extends Error {}

export interface Analysis {
  labels: FlatLabel[];
  keywords: Keyword[];
  hasVolume: boolean;
  findings: Finding[];
  // Coverage: share of demand (weighted by volume when present) that has a
  // strong nav home. The single number that frames the whole report.
  demandCoverage: number;
  tree: NavNode[];
  thresholds: Thresholds; // the cutoffs actually used (after clamping)
}

function topLevelSections(labels: FlatLabel[]): FlatLabel[] {
  return labels.filter((l) => l.depth === 0);
}

function weightOf(kw: Keyword, hasVolume: boolean): number {
  return hasVolume ? Math.max(kw.volume, 1) : 1;
}

export function analyze(input: AnalysisInput): Analysis {
  const thresholds = normalizeThresholds(input.thresholds ?? DEFAULT_THRESHOLDS);
  const tree = parseMenu(input.menuText);
  const labels = flatten(tree);
  // A structurally valid but empty tree (e.g. JSON "[]") still has no labels to
  // analyze. Treat it as an empty menu rather than reporting 0% on nothing.
  if (labels.length === 0) {
    throw new EmptyMenuError("El menu no tiene ningun label para analizar.");
  }
  const keywords = parseKeywords(input.keywordText);
  const hasVolume = anyVolume(keywords);
  const findings: Finding[] = [];

  // --- Pass 1: each label, what demand does it answer? ---
  for (const lab of labels) {
    const ranked = rank(lab.label, keywords, (k) => k.term);
    const best = ranked[0];
    const bestScore = best ? best.score : 0;
    const band = bandOf(bestScore, thresholds);

    // Ghost label: nothing in the demand set comes close.
    if (band === "none") {
      findings.push({
        kind: "ghost-label",
        label: lab.label,
        path: lab.path,
        score: bestScore,
        band,
        detail: `"${lab.label}" no matchea con ninguna keyword objetivo. Ocupa lugar en la nav sin captar demanda.`,
        suggestion: `Confirma con datos si "${lab.label}" tiene busquedas propias. Si no, fusionalo o sacalo.`,
      });
      continue;
    }

    // Ambiguous label: reads as generic filler, or spreads weakly across many
    // queries without owning any. Either way the user cannot predict it.
    const weakSpread = ranked.filter(
      (r) => r.score >= thresholds.weak && r.score < thresholds.strong,
    ).length;
    if (isVagueLabel(lab.label) || (band === "weak" && weakSpread >= 3)) {
      const clearer = best.item;
      findings.push({
        kind: "ambiguous-label",
        label: lab.label,
        path: lab.path,
        score: bestScore,
        band,
        detail: `"${lab.label}" es ambiguo: ${isVagueLabel(lab.label) ? "es una palabra generica de nav" : `se reparte entre ${weakSpread} intenciones sin quedarse con ninguna`}.`,
        suggestion: `Renombralo a algo que la gente busca, por ejemplo "${clearer.term}".`,
      });
    }
  }

  // --- Pass 2: each keyword, does the nav give it a home? ---
  for (const kw of keywords) {
    const ranked = rank(kw.term, labels, (l) => l.label);
    const best = ranked[0];
    const bestScore = best ? best.score : 0;
    const band = bandOf(bestScore, thresholds);

    if (band !== "strong") {
      // Where would it live? Best top-level section by theme.
      const sections = topLevelSections(labels);
      const parentRank = rank(kw.term, sections, (l) => l.label);
      const parent = parentRank[0] && parentRank[0].score > 0 ? parentRank[0].item.label : undefined;
      findings.push({
        kind: "missing-demand",
        keyword: kw.term,
        volume: kw.volume,
        score: bestScore,
        band,
        detail:
          band === "none"
            ? `Nadie en la nav responde a "${kw.term}". Demanda sin puerta de entrada.`
            : `"${kw.term}" solo matchea debil ("${best.item.label}"). La intencion no tiene un label claro.`,
        suggestion: parent
          ? `Crea un label para "${kw.term}"${parent ? ` bajo "${parent}"` : ""}.`
          : `Crea un label para "${kw.term}".`,
        suggestedParent: parent,
      });
    }
  }

  // --- Pass 3: hierarchy. A leaf that matches another section better than
  // its own parent is probably mis-filed. ---
  const sections = topLevelSections(labels);
  for (const lab of labels) {
    if (lab.depth === 0 || lab.path.length === 0) continue;
    const currentParent = lab.path[lab.path.length - 1];
    const ownParentScore = similarity(lab.label, currentParent);
    const sectionRank = rank(lab.label, sections, (s) => s.label).filter(
      (r) => r.item.label !== currentParent,
    );
    const better = sectionRank[0];
    if (better && better.score >= thresholds.strong && better.score > ownParentScore + 0.2) {
      findings.push({
        kind: "misnested-label",
        label: lab.label,
        path: lab.path,
        score: better.score,
        band: bandOf(better.score, thresholds),
        detail: `"${lab.label}" cuelga de "${currentParent}" pero encaja mejor con "${better.item.label}".`,
        suggestion: `Mové "${lab.label}" bajo "${better.item.label}".`,
        suggestedParent: better.item.label,
      });
    }
  }

  // --- Demand coverage score ---
  let covered = 0;
  let total = 0;
  for (const kw of keywords) {
    const w = weightOf(kw, hasVolume);
    total += w;
    const best = rank(kw.term, labels, (l) => l.label)[0];
    if (best && best.score >= thresholds.strong) covered += w;
  }
  const demandCoverage = total === 0 ? 0 : covered / total;

  // Stable ordering: by kind priority, then volume, then score.
  const kindOrder: Record<FindingKind, number> = {
    "missing-demand": 0,
    "ghost-label": 1,
    "ambiguous-label": 2,
    "misnested-label": 3,
  };
  findings.sort((a, b) => {
    if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
    if ((b.volume ?? 0) !== (a.volume ?? 0)) return (b.volume ?? 0) - (a.volume ?? 0);
    return b.score - a.score;
  });

  return { labels, keywords, hasVolume, findings, demandCoverage, tree, thresholds };
}
