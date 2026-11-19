"use strict";
// Usage:
//   OPENROUTER_API_KEY=... CHAT_MODEL=z-ai/glm-5.3 node chatbot/evals/run-evals.js [--filter cat] [--limit N] [--out file.json]
// Runs questions.json through chatbot/chat.js directly (same code the endpoint uses).
// Set EVAL_ENDPOINT=http://localhost:3000/api/chatbot/message to hit a running server instead.
const fs = require("fs");
const path = require("path");
const { answer } = require("../chat");

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, "questions.json"), "utf8"))
  .filter((q) => !arg("filter") || q.category === arg("filter"))
  .slice(0, Number(arg("limit")) || 1000);

async function ask(q) {
  if (!process.env.EVAL_ENDPOINT) return answer(q, []);
  const r = await fetch(process.env.EVAL_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q }) });
  return r.json();
}

(async () => {
  const model = process.env.CHAT_MODEL || "anthropic/claude-sonnet-5.5 (default)";
  console.log(`Model: ${model}   Questions: ${questions.length}\n`);
  const results = [];
  for (const [i, q] of questions.entries()) {
    const t0 = Date.now();
    const r = await ask(q.q);
    const cited = [...new Set((r.answer || "").match(/https?:\/\/[^\s)\]>"']+/g) || [])].map((u) => u.replace(/[.,;]+$/, ""));
    results.push({ ...q, answer: r.answer, cited, toolCalls: r.toolCalls, ms: Date.now() - t0, error: r.error });
    console.log(`[${i + 1}/${questions.length}] (${q.category}) ${q.q}`);
    console.log(`  expect: ${q.expect}`);
    console.log(`  tools : ${(r.toolCalls || []).map((c) => `${c.tool}(${Object.values(c.args)[0]})`).join(" -> ") || "none"}`);
    console.log(`  cited : ${cited.join(", ") || "none"}`);
    console.log(`  answer: ${(r.answer || "").replace(/\s+/g, " ").slice(0, 600)}\n`);
  }
  const out = arg("out") || path.join(__dirname, `results-${model.replace(/[^a-z0-9.]+/gi, "_")}.json`);
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(`Saved ${out}`);
})();
