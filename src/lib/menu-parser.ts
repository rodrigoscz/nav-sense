// Parse a site menu / information architecture from two accepted shapes:
//   1. Indented text (tabs or spaces mark depth)
//   2. JSON: [{ label, children? }]
// Both yield the same NavNode tree, then we flatten it into addressable paths.

export interface NavNode {
  label: string;
  children: NavNode[];
}

export interface FlatLabel {
  label: string;
  path: string[]; // ancestor labels, root first, excluding self
  depth: number; // 0 = top level
  isLeaf: boolean;
}

export class MenuParseError extends Error {}

function isNavNodeArray(value: unknown): value is { label: string; children?: unknown }[] {
  return Array.isArray(value) && value.every((v) => v && typeof v === "object" && "label" in v);
}

function coerceJson(value: { label: string; children?: unknown }[]): NavNode[] {
  return value.map((raw) => {
    if (typeof raw.label !== "string" || raw.label.trim() === "") {
      throw new MenuParseError("Cada nodo necesita un label de texto no vacio.");
    }
    const children = isNavNodeArray(raw.children) ? coerceJson(raw.children) : [];
    return { label: raw.label.trim(), children };
  });
}

// Indentation parser. Width of leading whitespace defines nesting. We measure
// each line's indent and attach it under the nearest shallower ancestor, so
// mixed but consistent indentation still works.
function parseIndented(text: string): NavNode[] {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\t/g, "  ")) // tab = 2 spaces
    .filter((line) => line.trim() !== "");

  const roots: NavNode[] = [];
  const stack: { indent: number; node: NavNode }[] = [];

  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    const label = line.trim().replace(/^[-*•]\s*/, ""); // tolerate bullet markers
    const node: NavNode = { label, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ indent, node });
  }

  if (roots.length === 0) {
    throw new MenuParseError("No encontre ninguna entrada de menu en el texto.");
  }
  return roots;
}

export function parseMenu(input: string): NavNode[] {
  const trimmed = input.trim();
  if (trimmed === "") throw new MenuParseError("El menu esta vacio.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new MenuParseError("Parece JSON pero no se pudo parsear. Revisa comas y comillas.");
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (!isNavNodeArray(arr)) {
      throw new MenuParseError('JSON invalido. Forma esperada: [{ "label": "...", "children": [...] }].');
    }
    return coerceJson(arr as { label: string; children?: unknown }[]);
  }
  return parseIndented(trimmed);
}

// Flatten the tree into one entry per label, carrying its ancestor path.
export function flatten(nodes: NavNode[], path: string[] = []): FlatLabel[] {
  const out: FlatLabel[] = [];
  for (const node of nodes) {
    out.push({
      label: node.label,
      path,
      depth: path.length,
      isLeaf: node.children.length === 0,
    });
    if (node.children.length > 0) {
      out.push(...flatten(node.children, [...path, node.label]));
    }
  }
  return out;
}
