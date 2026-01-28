import fs from "node:fs";
import path from "node:path";

/**
 * Extracts all Georgian words from data/exercisesData.ts and writes:
 * - data/wordLetterCounts.ts: Record<string, number> mapping georgian -> georgian.length
 *
 * Notes:
 * - Georgian Mkhedruli letters are single code points, so JS `.length` works for counting letters.
 * - We still build a reference so manual replacements don't require re-counting each time.
 */

const repoRoot = process.cwd();
const exercisesPath = path.join(repoRoot, "data", "exercisesData.ts");
const outPath = path.join(repoRoot, "data", "wordLetterCounts.ts");

const src = fs.readFileSync(exercisesPath, "utf8");

const georgianWords = [];
const re = /georgian:\s*"([^"]+)"/g;
for (const m of src.matchAll(re)) {
  georgianWords.push(m[1]);
}

const uniq = Array.from(new Set(georgianWords));
uniq.sort((a, b) => a.localeCompare(b, "ka"));

const counts = Object.fromEntries(uniq.map((w) => [w, w.length]));

const header = `// GENERATED FILE — do not edit by hand.\n// Run: node scripts/buildWordLetterCounts.mjs\n\n`;
const body =
  `export const WORD_LETTER_COUNTS: Record<string, number> = ${JSON.stringify(counts, null, 2)};\n`;

fs.writeFileSync(outPath, header + body, "utf8");

console.log(`Wrote ${outPath}`);
console.log(`Unique words: ${uniq.length}`);

