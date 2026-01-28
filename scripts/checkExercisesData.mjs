import fs from "node:fs";
import path from "node:path";

// Loads the generated TS object with a tiny eval (safe within repo tooling).
function loadWordLetterCounts(wordCountsTsPath) {
  const ts = fs.readFileSync(wordCountsTsPath, "utf8");
  const jsonMatch = ts.match(/=\s*(\{[\s\S]*\});\s*$/m);
  if (!jsonMatch) throw new Error("Could not parse WORD_LETTER_COUNTS from wordLetterCounts.ts");
  return JSON.parse(jsonMatch[1]);
}

const repoRoot = process.cwd();
const exercisesPath = path.join(repoRoot, "data", "exercisesData.ts");
const wordCountsPath = path.join(repoRoot, "data", "wordLetterCounts.ts");

const counts = loadWordLetterCounts(wordCountsPath);
const src = fs.readFileSync(exercisesPath, "utf8");

const lines = src.split("\n");
const levels = new Map(); // level -> exercises
let currentLevel = null;

for (let i = 0; i < lines.length; i++) {
  const levelMatch = lines[i].match(/^\s*(\d+):\s*\[/);
  if (levelMatch) {
    currentLevel = Number(levelMatch[1]);
    levels.set(currentLevel, []);
  }

  const exMatch = lines[i].match(
    /\{\s*id:\s*"([^"]+)",\s*georgian:\s*"([^"]+)",\s*transcription:\s*"([^"]+)",\s*meaning:\s*"([^"]+)"\s*\}/,
  );
  if (exMatch && currentLevel) {
    const georgian = exMatch[2];
    const len = counts[georgian];
    levels.get(currentLevel).push({
      id: exMatch[1],
      georgian,
      meaning: exMatch[4],
      len,
      missingFromRef: len == null,
      line: i + 1,
    });
  }
}

let hasIssues = false;

for (const [level, exercises] of Array.from(levels.entries()).sort((a, b) => a[0] - b[0])) {
  const expectedLen = level;
  const wrong = exercises.filter((e) => e.len !== expectedLen);

  const seen = new Set();
  const dups = exercises.filter((e) => (seen.has(e.georgian) ? true : (seen.add(e.georgian), false)));

  const missing = exercises.filter((e) => e.missingFromRef);

  if (wrong.length || dups.length || missing.length) {
    hasIssues = true;
    console.log(`\nLevel ${level} (expected ${expectedLen}, have ${exercises.length}):`);
    if (missing.length) {
      console.log(
        `  ❌ missing from data/wordLetterCounts.ts (${missing.length}) — run: node scripts/buildWordLetterCounts.mjs`,
      );
      for (const e of missing) console.log(`     ${e.id} "${e.georgian}" line ${e.line}`);
    }
    if (wrong.length) {
      console.log(`  ❌ wrong length (${wrong.length}):`);
      for (const e of wrong) console.log(`     ${e.id} "${e.georgian}" -> ${e.len} (${e.meaning})`);
    }
    if (dups.length) {
      console.log(`  ❌ duplicates (${dups.length}):`);
      for (const e of dups) console.log(`     ${e.id} "${e.georgian}" (${e.meaning})`);
    }
  } else {
    console.log(`Level ${level}: ${exercises.length} ✓`);
  }
}

process.exit(hasIssues ? 1 : 0);

