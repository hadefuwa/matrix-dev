"use strict";
const fs = require("fs");
const path = require("path");
const { searchSite, readPage } = require("./site");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOOL_CALLS = Number(process.env.CHAT_MAX_TOOL_CALLS || 4);
const MAX_HISTORY_TURNS = Number(process.env.CHAT_MAX_HISTORY || 6);
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOKENS = Number(process.env.CHAT_MAX_TOKENS || 800);
const CONTACT_URL = process.env.CHAT_CONTACT_URL || "https://www.matrixtsl.com/contact-us/";

// Model slugs: CHAT_MODEL=z-ai/glm-5.3  or  anthropic/claude-sonnet-5.5
const DEFAULT_MODEL = "z-ai/glm-5.3"; // cheap default; override with CHAT_MODEL

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_site",
      description: "Search the Matrix TSL website (products, pages, posts, resources). Returns top 5 results with title, URL and type.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    }
  },
  {
    type: "function",
    function: {
      name: "read_page",
      description: "Read the text content of a page on the Matrix TSL website. URL must come from search_site results or be a matrixtsl.com URL.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
    }
  }
];

function systemPrompt() {
  return fs.readFileSync(path.join(__dirname, "system-prompt.md"), "utf8")
    .replace(/{{CONTACT_URL}}/g, CONTACT_URL)
    .replace(/{{MAX_TOOL_CALLS}}/g, String(MAX_TOOL_CALLS));
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY_TURNS * 2)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

async function callModel(messages, withTools) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Matrix TSL Chat" },
    body: JSON.stringify({
      model: process.env.CHAT_MODEL || DEFAULT_MODEL,
      temperature: 0.1,
      max_tokens: MAX_TOKENS,
      messages,
      tools: TOOLS,
      tool_choice: withTools ? "auto" : "none"
    }),
    signal: AbortSignal.timeout(60000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.choices || !data.choices[0]) {
    throw new Error(`OpenRouter ${res.status}: ${(data.error && data.error.message) || "bad response"}`);
  }
  return data.choices[0].message;
}

async function runTool(name, args) {
  try {
    if (name === "search_site") return await searchSite(args.query);
    if (name === "read_page") return await readPage(args.url);
    return { error: "Unknown tool" };
  } catch (err) {
    return { error: `Tool failed: ${err.message}` };
  }
}

// Returns { answer, sources[], toolCalls[] }. Never throws for model/site errors.
async function answer(userMessage, history) {
  const message = String(userMessage || "").trim().slice(0, MAX_MESSAGE_CHARS);
  const messages = [{ role: "system", content: systemPrompt() }, ...cleanHistory(history), { role: "user", content: message }];
  const toolLog = [];
  const seenUrls = new Set();

  try {
    for (let round = 0; round < MAX_TOOL_CALLS + 1; round++) {
      const allowTools = toolLog.length < MAX_TOOL_CALLS;
      if (!allowTools) {
        messages.push({ role: "user", content: "Tool limit reached. Now answer the original question in plain text using only what the tools returned (or say you couldn't find it), citing source URLs." });
      }
      let reply = await callModel(messages, allowTools);
      if (!(reply.content || "").trim() && !(reply.tool_calls || []).length) {
        // Empty reply (refusal or provider quirk): retry once with an explicit nudge.
        messages.push({ role: "user", content: "Please reply to the user in plain text, following your rules." });
        reply = await callModel(messages, false);
      }
      const calls = reply.tool_calls || [];
      if (!calls.length || !allowTools) {
        return { answer: (reply.content || "").trim() || fallbackText(), sources: [...seenUrls], toolCalls: toolLog };
      }
      messages.push({ role: "assistant", content: reply.content || "", tool_calls: calls });
      for (const call of calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || "{}"); } catch (_) {}
        let result;
        if (toolLog.length >= MAX_TOOL_CALLS) {
          result = { error: "Tool call limit reached. Answer now from what you have." };
        } else {
          result = await runTool(call.function.name, args);
          toolLog.push({ tool: call.function.name, args });
          if (result.results) result.results.forEach((r) => seenUrls.add(r.url));
          if (result.url) seenUrls.add(result.url);
        }
        // Fetched content is wrapped so the model treats it as data.
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ untrusted_site_data: result }).slice(0, 12000) });
      }
    }
    return { answer: fallbackText(), sources: [...seenUrls], toolCalls: toolLog };
  } catch (err) {
    console.error("[chatbot]", err.message);
    return { answer: fallbackText(), sources: [], toolCalls: toolLog, error: err.message };
  }
}

function fallbackText() {
  return `Sorry, I can't answer that right now. Please contact our team directly: ${CONTACT_URL}`;
}

module.exports = { answer, MAX_MESSAGE_CHARS };
