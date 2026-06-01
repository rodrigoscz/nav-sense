import type { Analysis, Finding } from "./analyze";
import type { NavNode } from "./menu-parser";

// Turn findings into two artifacts:
//   1. A proposed, reordered information architecture (a new tree)
//   2. A markdown changelog of the moves, the way Rodrigo likes to read diffs
// The changelog is the deliverable. It reads like a code review of the menu.

function cloneTree(nodes: NavNode[]): NavNode[] {
  return nodes.map((n) => ({ label: n.label, children: cloneTree(n.children) }));
}

function findNode(nodes: NavNode[], label: string): NavNode | null {
  for (const n of nodes) {
    if (n.label === label) return n;
    const deep = findNode(n.children, label);
    if (deep) return deep;
  }
  return null;
}

// Remove a node identified by its label AND its ancestor path. Path-aware so
// duplicate labels under different parents (two "API", two "Blog") do not get
// confused: we only splice the one whose location matches the finding.
function removeNodeByPath(nodes: NavNode[], label: string, path: string[], trail: string[] = []): NavNode | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].label === label && samePath(trail, path)) {
      return nodes.splice(i, 1)[0];
    }
    const deep = removeNodeByPath(nodes[i].children, label, path, [...trail, nodes[i].label]);
    if (deep) return deep;
  }
  return null;
}

function samePath(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((seg, i) => seg === b[i]);
}

export interface Proposal {
  tree: NavNode[];
  changelog: string;
}

export function buildProposal(analysis: Analysis): Proposal {
  const tree = cloneTree(analysis.tree);
  const renames: { from: string; to: string }[] = [];
  const removes: string[] = [];
  const adds: { label: string; parent?: string }[] = [];
  const moves: { label: string; to: string }[] = [];

  for (const f of analysis.findings) {
    if (f.kind === "ambiguous-label" && f.label) {
      const to = renameTargetFromSuggestion(f);
      if (to && to !== f.label) {
        const node = findNode(tree, f.label);
        if (node) {
          node.label = to;
          renames.push({ from: f.label, to });
        }
      }
    } else if (f.kind === "ghost-label" && f.label) {
      // We flag ghosts in the changelog but do NOT auto-delete: removal is a
      // call for the human with real data. Mark for review.
      removes.push(f.label);
    } else if (f.kind === "missing-demand" && f.keyword) {
      const parent = f.suggestedParent;
      const newNode: NavNode = { label: f.keyword, children: [] };
      const host = parent ? findNode(tree, parent) : null;
      if (host) host.children.push(newNode);
      else tree.push(newNode);
      adds.push({ label: f.keyword, parent });
    } else if (f.kind === "misnested-label" && f.label && f.suggestedParent) {
      const node = removeNodeByPath(tree, f.label, f.path ?? []);
      const host = findNode(tree, f.suggestedParent);
      if (node && host) {
        host.children.push(node);
        moves.push({ label: f.label, to: f.suggestedParent });
      } else if (node) {
        tree.push(node); // could not find host, keep it alive at root
      }
    }
  }

  const changelog = renderChangelog(analysis, { renames, removes, adds, moves });
  return { tree, changelog };
}

function renameTargetFromSuggestion(f: Finding): string | null {
  // Suggestion text is: ... por ejemplo "X".
  const m = f.suggestion.match(/"([^"]+)"\.?$/);
  return m ? m[1] : null;
}

interface Changes {
  renames: { from: string; to: string }[];
  removes: string[];
  adds: { label: string; parent?: string }[];
  moves: { label: string; to: string }[];
}

function renderChangelog(analysis: Analysis, c: Changes): string {
  const pct = Math.round(analysis.demandCoverage * 100);
  const lines: string[] = [];
  lines.push("# Changelog de arquitectura semantica");
  lines.push("");
  lines.push(`Cobertura de demanda actual: **${pct}%** de la demanda objetivo tiene un label claro.`);
  lines.push("");
  lines.push(
    `Umbrales usados: fuerte ${analysis.thresholds.strong.toFixed(2)}, debil ${analysis.thresholds.weak.toFixed(2)}. ` +
      `Son tu decision: movelos y el reporte cambia.`,
  );
  lines.push("");

  if (c.adds.length) {
    lines.push("## Agregar (demanda sin label)");
    for (const a of c.adds) {
      lines.push(a.parent ? `- ADD "${a.label}" bajo "${a.parent}"` : `- ADD "${a.label}" (nivel raiz)`);
    }
    lines.push("");
  }
  if (c.renames.length) {
    lines.push("## Renombrar (labels ambiguos)");
    for (const r of c.renames) lines.push(`- RENAME "${r.from}" -> "${r.to}"`);
    lines.push("");
  }
  if (c.moves.length) {
    lines.push("## Mover (jerarquia que no matchea intencion)");
    for (const m of c.moves) lines.push(`- MOVE "${m.label}" -> bajo "${m.to}"`);
    lines.push("");
  }
  if (c.removes.length) {
    lines.push("## Revisar para sacar (labels sin demanda)");
    for (const r of c.removes) lines.push(`- REVIEW "${r}" (sin keyword objetivo, confirma con datos antes de borrar)`);
    lines.push("");
  }
  if (!c.adds.length && !c.renames.length && !c.moves.length && !c.removes.length) {
    lines.push("Sin cambios sugeridos. La nav ya habla el idioma de la demanda.");
    lines.push("");
  }

  lines.push("---");
  lines.push("Generado por nav-sense. La navegacion es una decision de lenguaje, no de gusto.");
  return lines.join("\n");
}

// Render any tree as indented text, for the "propuesta" panel.
export function treeToText(nodes: NavNode[], depth = 0): string {
  const out: string[] = [];
  for (const n of nodes) {
    out.push(`${"  ".repeat(depth)}${n.label}`);
    if (n.children.length) out.push(treeToText(n.children, depth + 1));
  }
  return out.join("\n");
}
