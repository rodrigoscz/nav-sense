import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/lib/analyze";
import { buildProposal, treeToText } from "../src/lib/changelog";
import { DEMO_MENU, DEMO_KEYWORDS } from "../src/fixtures/demo";
import { parseMenu, flatten } from "../src/lib/menu-parser";
import { parseKeywords } from "../src/lib/keyword-parser";
import { similarity } from "../src/lib/similarity";

test("indented menu parses into a tree with depth", () => {
  const labels = flatten(parseMenu(DEMO_MENU));
  const producto = labels.find((l) => l.label === "Producto");
  const api = labels.find((l) => l.label === "API");
  assert.equal(producto?.depth, 0);
  assert.equal(api?.depth, 1);
  assert.deepEqual(api?.path, ["Producto"]);
});

test("JSON menu parses equivalently", () => {
  const json = '[{"label":"Producto","children":[{"label":"API"}]}]';
  const labels = flatten(parseMenu(json));
  assert.equal(labels.length, 2);
  assert.equal(labels[1].label, "API");
});

test("keywords parse volume after a pipe", () => {
  const kws = parseKeywords("seo audit | 2400\nplain term");
  assert.equal(kws[0].volume, 2400);
  assert.equal(kws[1].volume, 0);
});

test("similarity folds plurals and accents", () => {
  assert.ok(similarity("Soluciones", "solucion seo") > 0);
  assert.ok(similarity("Integraciones", "integracion") >= 0.6);
});

test("demo surfaces each finding kind", () => {
  const a = analyze({ menuText: DEMO_MENU, keywordText: DEMO_KEYWORDS });
  const kinds = new Set(a.findings.map((f) => f.kind));
  assert.ok(kinds.has("missing-demand"), "should find demand with no label");
  assert.ok(kinds.has("ghost-label"), "should flag Novedades as ghost");
  assert.ok(kinds.has("ambiguous-label"), "should flag vague labels");
});

test("missing-demand is ordered by volume", () => {
  const a = analyze({ menuText: DEMO_MENU, keywordText: DEMO_KEYWORDS });
  const missing = a.findings.filter((f) => f.kind === "missing-demand");
  for (let i = 1; i < missing.length; i++) {
    assert.ok((missing[i - 1].volume ?? 0) >= (missing[i].volume ?? 0));
  }
});

test("proposal adds missing demand into the tree", () => {
  const a = analyze({ menuText: DEMO_MENU, keywordText: DEMO_KEYWORDS });
  const { tree, changelog } = buildProposal(a);
  const text = treeToText(tree);
  assert.ok(text.includes("integraciones"), "missing keyword should appear in proposed IA");
  assert.ok(changelog.includes("# Changelog"), "changelog has a heading");
  assert.ok(changelog.includes("Cobertura de demanda"));
});

test("coverage is between 0 and 1", () => {
  const a = analyze({ menuText: DEMO_MENU, keywordText: DEMO_KEYWORDS });
  assert.ok(a.demandCoverage >= 0 && a.demandCoverage <= 1);
});

test("clean menu against matching demand yields no missing-demand", () => {
  const menu = "Precios\nFunciones\nContacto";
  const kws = "precios\nfunciones\ncontacto";
  const a = analyze({ menuText: menu, keywordText: kws });
  assert.equal(a.findings.filter((f) => f.kind === "missing-demand").length, 0);
  assert.equal(a.demandCoverage, 1);
});
