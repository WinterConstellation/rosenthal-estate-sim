import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { writeJsonLf } from "../script-edit/sourceText.mjs";

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = ".understand-anything";
const SCRIPT_EDIT_API_BASE = process.env.SCRIPT_EDIT_API_BASE ?? "http://127.0.0.1:3799";
const SCRIPT_EDIT_TOKEN = process.env.SCRIPT_EDIT_TOKEN ?? "understand-edit";

const ROOT_FILES = [
  "README.md",
  "package.json",
  "vite.config.js",
  "index.html",
  "AGENTS.md",
];

const SOURCE_ROOTS = ["src", "scripts", "docs"];
const IGNORED_PARTS = new Set([
  ".git",
  "node_modules",
  "dist",
  "release",
  ".understand-anything",
  "test-builds",
]);

function toProjectPath(path) {
  return relative(PROJECT_ROOT, path).replaceAll("\\", "/");
}

function readText(path) {
  return readFileSync(join(PROJECT_ROOT, path), "utf8").replace(/\r\n?/g, "\n");
}

function walk(dir, result = []) {
  const absolute = join(PROJECT_ROOT, dir);
  if (!existsSync(absolute)) return result;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (IGNORED_PARTS.has(entry.name)) continue;
    const child = join(absolute, entry.name);
    const projectPath = toProjectPath(child);
    if (entry.isDirectory()) {
      walk(projectPath, result);
    } else if (entry.isFile()) {
      result.push(projectPath);
    }
  }
  return result;
}

function collectProjectFiles() {
  return [
    ...ROOT_FILES.filter((path) => existsSync(join(PROJECT_ROOT, path))),
    ...SOURCE_ROOTS.flatMap((root) => walk(root)),
  ].filter((path) => !path.endsWith(".log"));
}

function detectNodeType(path) {
  const ext = extname(path).toLowerCase();
  if ([".md", ".txt"].includes(ext)) return "document";
  if ([".json", ".yaml", ".yml"].includes(ext) || path.endsWith("vite.config.js")) return "config";
  return "file";
}

function detectLayerId(path) {
  if (path.startsWith("src/components/") || path.startsWith("src/screens/") || path === "src/App.jsx" || path === "src/main.jsx" || path === "src/styles.css") return "layer:ui";
  if (path.startsWith("src/engine/")) return "layer:engine";
  if (path.startsWith("src/data/")) return "layer:script-data";
  if (path.startsWith("src/rules/")) return "layer:rules";
  if (path.startsWith("scripts/")) return "layer:tooling";
  if (path.startsWith("docs/") || path === "README.md" || path === "AGENTS.md") return "layer:docs";
  return "layer:project-config";
}

function languageFor(path) {
  const ext = extname(path).toLowerCase();
  const map = {
    ".css": "css",
    ".html": "html",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".md": "markdown",
    ".mjs": "javascript",
    ".txt": "text",
  };
  return map[ext] ?? "text";
}

function lineCount(path) {
  const content = readText(path);
  return content.length === 0 ? 1 : content.split("\n").length;
}

function lineRangeFromSpan(source, locator) {
  if (locator?.type !== "source-span") return undefined;
  const start = source.slice(0, locator.start).split("\n").length;
  const end = source.slice(0, locator.end).split("\n").length;
  return [start, Math.max(start, end)];
}

function fileSummary(path) {
  if (path === "src/App.jsx") return "React application shell that ties the estate simulation UI, saves, developer controls, and script-loaded special events together.";
  if (path === "src/engine/scriptLoader.js") return "Manifest-driven loader that imports large script packs on demand.";
  if (path === "src/data/scriptManifest.js") return "Manifest/index file for large script packs. Editable manifest fields are linked from graph nodes.";
  if (path === "src/data/scriptPacks/specialEventGroups.js") return "Large body data pack for special event titles, dialogue text, and choice labels.";
  if (path.startsWith("scripts/script-edit/")) return "Local editing support for mapping graph-visible script items back to exact source spans.";
  if (path.startsWith("src/rules/")) return "Rule and numeric data used by the game loop.";
  if (path.startsWith("src/engine/")) return "Simulation engine logic and progression helpers.";
  if (path.startsWith("src/components/") || path.startsWith("src/screens/")) return "User interface component for the estate simulation.";
  if (path.startsWith("docs/")) return "Project documentation and handoff context.";
  return "Project file included in the Understand Anything graph.";
}

function edge(source, target, type, description, weight = 0.6) {
  return { source, target, type, direction: "forward", description, weight };
}

function importTarget(importerPath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(PROJECT_ROOT, dirname(importerPath), specifier);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    join(base, "index.js"),
    join(base, "index.jsx"),
  ];
  const hit = candidates.find((candidate) => existsSync(candidate));
  return hit ? toProjectPath(hit) : null;
}

function addImportEdges(files, edges) {
  const fileSet = new Set(files);
  for (const file of files) {
    if (![".js", ".jsx", ".mjs"].includes(extname(file))) continue;
    const source = readText(file);
    const imports = source.matchAll(/import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g);
    for (const match of imports) {
      const targetPath = importTarget(file, match[1]);
      if (!targetPath || !fileSet.has(targetPath)) continue;
      edges.push(edge(`file:${file}`, `file:${targetPath}`, "imports", `${file} imports ${targetPath}`, 0.7));
    }
  }
}

function gitCommitHash() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: PROJECT_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function loadScriptEditIndex() {
  const path = join(PROJECT_ROOT, ".script-edit", "index.json");
  if (!existsSync(path)) return { entries: [] };
  return JSON.parse(readFileSync(path, "utf8"));
}

function scriptEditNodeId(entry) {
  return `concept:script-edit:${entry.id}`;
}

function scriptEditSummary(entry) {
  const type = entry.editableFields?.[0]?.type ?? "text";
  return `Editable ${entry.field ?? "value"} item from ${entry.sourceFile}. This node is linked to the local script edit API and writes back to the original source span. Field type: ${type}.`;
}

function buildGraph() {
  const files = collectProjectFiles();
  const nodes = files.map((path) => ({
    id: `file:${path}`,
    type: detectNodeType(path),
    name: path.split("/").at(-1) ?? path,
    filePath: path,
    lineRange: [1, lineCount(path)],
    summary: fileSummary(path),
    tags: [languageFor(path), detectLayerId(path).replace("layer:", "")],
    complexity: path === "src/App.jsx" ? "complex" : path.startsWith("src/engine/") ? "moderate" : "simple",
    languageNotes: path.includes("script") || path.startsWith("src/data/")
      ? "Manifest/index + loader + body-data split is the key structure for safe script editing."
      : undefined,
  }));

  const edges = [];
  addImportEdges(files, edges);

  const scriptEditIndex = loadScriptEditIndex();
  const scriptEntries = scriptEditIndex.entries ?? [];
  const sourceCache = new Map();
  for (const entry of scriptEntries) {
    const source = sourceCache.get(entry.sourceFile) ?? readText(entry.sourceFile);
    sourceCache.set(entry.sourceFile, source);
    const lineRange = lineRangeFromSpan(source, entry.locator);
    nodes.push({
      id: scriptEditNodeId(entry),
      type: "concept",
      name: entry.label,
      filePath: entry.sourceFile,
      lineRange,
      summary: scriptEditSummary(entry),
      tags: ["editable", entry.kind, entry.field ?? "value", "script-edit-index"],
      complexity: entry.kind === "dialogue" ? "moderate" : "simple",
      languageNotes: "그래프에서 이 노드를 선택하면 수정용 인덱스 ID로 원본 파일의 정확한 위치를 편집할 수 있습니다.",
      scriptEdit: {
        id: entry.id,
        kind: entry.kind,
        field: entry.field ?? "value",
        folderPath: entry.folderPath ?? [],
        apiBase: SCRIPT_EDIT_API_BASE,
        token: SCRIPT_EDIT_TOKEN,
      },
    });
    const fileNodeId = `file:${entry.sourceFile}`;
    if (nodes.some((node) => node.id === fileNodeId)) {
      edges.push(edge(fileNodeId, scriptEditNodeId(entry), "contains", `${entry.sourceFile} contains editable item ${entry.id}`, 1));
    }
  }

  const layerMap = new Map([
    ["layer:ui", { id: "layer:ui", name: "UI", description: "React screens and components.", nodeIds: [] }],
    ["layer:engine", { id: "layer:engine", name: "Simulation Engine", description: "Game state, rules execution, save flow, and progression.", nodeIds: [] }],
    ["layer:script-data", { id: "layer:script-data", name: "Script Data", description: "Manifest, loader-facing data packs, dialogue, choices, and large body content.", nodeIds: [] }],
    ["layer:rules", { id: "layer:rules", name: "Rules and Numbers", description: "Numeric rules, tutorial scripts, marks, passives, and balancing data.", nodeIds: [] }],
    ["layer:tooling", { id: "layer:tooling", name: "Tooling", description: "Verification, build, and local edit-index tools.", nodeIds: [] }],
    ["layer:docs", { id: "layer:docs", name: "Docs and Handoff", description: "Project documentation, plans, and handoff records.", nodeIds: [] }],
    ["layer:project-config", { id: "layer:project-config", name: "Project Config", description: "Build and package configuration.", nodeIds: [] }],
    ["layer:editable-index", { id: "layer:editable-index", name: "Editable Script Index", description: "Graph nodes that map directly to safe local source edits.", nodeIds: [] }],
  ]);

  for (const node of nodes) {
    if (node.scriptEdit) {
      layerMap.get("layer:editable-index").nodeIds.push(node.id);
      continue;
    }
    const path = node.filePath ?? "";
    layerMap.get(detectLayerId(path)).nodeIds.push(node.id);
  }

  return {
    version: "1.0.0",
    kind: "codebase",
    project: {
      name: "Rosenthal Estate Simulation",
      languages: ["javascript", "jsx", "css", "markdown"],
      frameworks: ["React", "Vite", "Electron", "Understand Anything"],
      description: "A local estate simulation with manifest-driven script packs and a graph-linked safe editing index.",
      analyzedAt: new Date().toISOString(),
      gitCommitHash: gitCommitHash(),
    },
    nodes,
    edges,
    layers: [...layerMap.values()].filter((layer) => layer.nodeIds.length > 0),
    tour: [
      {
        order: 1,
        title: "Application Shell",
        description: "Start at the React app shell to see how UI, engine, rules, and loaded script packs meet.",
        nodeIds: ["file:src/App.jsx"],
      },
      {
        order: 2,
        title: "Manifest and Loader",
        description: "The script manifest names the pack, and the loader imports the body data only when needed.",
        nodeIds: ["file:src/data/scriptManifest.js", "file:src/engine/scriptLoader.js"],
      },
      {
        order: 3,
        title: "Editable Script Body",
        description: "Special event stages are represented as editable graph nodes tied back to source spans.",
        nodeIds: ["file:src/data/scriptPacks/specialEventGroups.js", ...scriptEntries.slice(0, 6).map(scriptEditNodeId)],
      },
    ],
  };
}

mkdirSync(join(PROJECT_ROOT, OUTPUT_DIR), { recursive: true });
const graph = buildGraph();
writeJsonLf(PROJECT_ROOT, `${OUTPUT_DIR}/knowledge-graph.json`, graph);
writeJsonLf(PROJECT_ROOT, `${OUTPUT_DIR}/meta.json`, {
  lastAnalyzedAt: graph.project.analyzedAt,
  gitCommitHash: graph.project.gitCommitHash,
  version: graph.version,
  analyzedFiles: graph.nodes.filter((node) => node.id.startsWith("file:")).length,
});
writeJsonLf(PROJECT_ROOT, `${OUTPUT_DIR}/config.json`, {
  autoUpdate: false,
  outputLanguage: "ko",
});

console.log(`Wrote ${OUTPUT_DIR}/knowledge-graph.json (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
