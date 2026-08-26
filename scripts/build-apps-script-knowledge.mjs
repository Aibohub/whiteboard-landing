import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const knowledgeDir = join(root, "knowledge");
const outputPath = join(root, "apps-script", "Knowledge.gs");
const files = readdirSync(knowledgeDir).filter((file) => file.endsWith(".md")).sort();
const knowledge = Object.fromEntries(
  files.map((file) => [file, readFileSync(join(knowledgeDir, file), "utf8").trim()]),
);

const output = `// Generated from knowledge/*.md by scripts/build-apps-script-knowledge.mjs.
// Edit the Markdown sources and run the generator instead of editing this map manually.
var WB_KNOWLEDGE_BASE = ${JSON.stringify(knowledge, null, 2)};

function wbKnowledgeText_(files) {
  return files
    .filter(function (file) { return Object.prototype.hasOwnProperty.call(WB_KNOWLEDGE_BASE, file); })
    .map(function (file) { return WB_KNOWLEDGE_BASE[file]; })
    .join("\\n\\n---\\n\\n");
}

function wbKnowledgeForChat_() {
  return wbKnowledgeText_(Object.keys(WB_KNOWLEDGE_BASE));
}

function wbKnowledgeForRoteiro_(niche) {
  var files = ["company.md", "packages.md", "brief-rules.md", "delivery-rules.md", "revision-policy.md"];
  var cleanNiche = String(niche || "").toLowerCase();
  if (cleanNiche.indexOf("im") !== -1 || cleanNiche.indexOf("real") !== -1) {
    files.push("niche-real-estate.md");
  } else if (cleanNiche.indexOf("pous") !== -1 || cleanNiche.indexOf("tur") !== -1 || cleanNiche.indexOf("hotel") !== -1) {
    files.push("niche-pousadas.md");
  } else if (cleanNiche.indexOf("constr") !== -1 || cleanNiche.indexOf("reform") !== -1 || cleanNiche.indexOf("arquitet") !== -1) {
    files.push("niche-construction.md");
  }
  return wbKnowledgeText_(files);
}
`;

writeFileSync(outputPath, output, "utf8");
console.log(`Generated apps-script/Knowledge.gs from ${files.length} Markdown files.`);
