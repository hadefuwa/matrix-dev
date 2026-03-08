const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT_DIR, "data"));
const UPLOADS_DIR = path.resolve(process.env.IMAGE_UPLOAD_DIR || path.join(ROOT_DIR, "assets", "uploads"));
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_CHAT_BODY_BYTES = 64 * 1024;
const CHAT_TIMEOUT_MS = 15000;
const CHAT_WINDOW_MS = 5 * 60 * 1000;
const CHAT_MAX_REQUESTS = 12;
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png"
};
const chatRateLimits = new Map();

const JSON_FILES = {
  topics: "topics.json",
  hardware: "hardware.json",
  templates: "templates.json"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        env: {
          dataDir: DATA_DIR,
          imageUploadDir: UPLOADS_DIR,
          adminTokenConfigured: Boolean(ADMIN_TOKEN),
          geminiConfigured: Boolean(GEMINI_API_KEY)
        }
      });
    }

    if (pathname === "/api/eblocks/chat") {
      if (req.method === "POST") return handleEblocksChat(req, res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (pathname === "/api/upload-image") {
      if (req.method === "POST") return handleImageUpload(req, res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (pathname.startsWith("/api/")) {
      const key = pathname.replace("/api/", "");
      if (key.endsWith(".csv")) {
        const csvKey = key.replace(".csv", "");
        if (!Object.prototype.hasOwnProperty.call(JSON_FILES, csvKey)) {
          return sendJson(res, 404, { error: "Unknown API resource" });
        }
        if (req.method === "GET") return handleGetCsv(csvKey, res);
        if (req.method === "PUT") return handlePutCsv(req, res, csvKey);
        return sendJson(res, 405, { error: "Method not allowed" });
      }

      if (!Object.prototype.hasOwnProperty.call(JSON_FILES, key)) {
        return sendJson(res, 404, { error: "Unknown API resource" });
      }
      if (req.method === "GET") return handleGetJson(key, res);
      if (req.method === "PUT") return handlePutJson(req, res, key);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    return serveStatic(pathname, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Matrix Apps server listening on port ${PORT}`);
});

async function handleGetJson(key, res) {
  const filePath = path.join(DATA_DIR, JSON_FILES[key]);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return sendJson(res, 200, JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") return sendJson(res, 404, { error: `${JSON_FILES[key]} not found` });
    return sendJson(res, 500, { error: `Could not read ${JSON_FILES[key]}` });
  }
}

async function handlePutJson(req, res, key) {
  if (!ADMIN_TOKEN) return sendJson(res, 500, { error: "ADMIN_TOKEN is not configured on the server" });
  if (!isAuthorized(req)) return sendJson(res, 401, { error: "Unauthorized" });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Invalid JSON body" });
  }

  if (!Array.isArray(body)) return sendJson(res, 400, { error: "Payload must be a JSON array" });

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, JSON_FILES[key]);
    await fs.writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
    return sendJson(res, 200, { ok: true, saved: JSON_FILES[key], count: body.length });
  } catch (error) {
    return sendJson(res, 500, { error: `Could not write ${JSON_FILES[key]}` });
  }
}


async function handleGetCsv(key, res) {
  const filePath = path.join(DATA_DIR, JSON_FILES[key]);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return sendText(res, 500, "CSV export expects an array");
    const csv = buildCsvForKey(key, data);
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${key}.csv`
    });
    return res.end(csv);
  } catch (error) {
    if (error.code === "ENOENT") return sendText(res, 404, `${JSON_FILES[key]} not found`);
    return sendText(res, 500, `Could not export ${JSON_FILES[key]} as CSV`);
  }
}

async function handlePutCsv(req, res, key) {
  if (!ADMIN_TOKEN) return sendJson(res, 500, { error: "ADMIN_TOKEN is not configured on the server" });
  if (!isAuthorized(req)) return sendJson(res, 401, { error: "Unauthorized" });

  let body;
  try {
    body = await readTextBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Invalid CSV body" });
  }

  let records;
  try {
    records = parseCsv(body);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Invalid CSV data" });
  }

  let payload;
  try {
    payload = parseCsvForKey(key, records);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "CSV mapping failed" });
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, JSON_FILES[key]);
    await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}
`, "utf8");
    return sendJson(res, 200, { ok: true, saved: JSON_FILES[key], count: payload.length });
  } catch (error) {
    return sendJson(res, 500, { error: `Could not write ${JSON_FILES[key]}` });
  }
}

async function handleImageUpload(req, res) {
  if (!ADMIN_TOKEN) return sendJson(res, 500, { error: "ADMIN_TOKEN is not configured on the server" });
  if (!isAuthorized(req)) return sendJson(res, 401, { error: "Unauthorized" });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Invalid JSON body" });
  }

  const filename = String(body.filename || "").trim();
  const contentType = String(body.contentType || "").trim().toLowerCase();
  const data = String(body.data || "");

  if (!filename || !contentType || !data) {
    return sendJson(res, 400, { error: "filename, contentType, and data are required" });
  }
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_IMAGE_TYPES, contentType)) {
    return sendJson(res, 400, { error: "Only PNG and JPEG images are allowed" });
  }

  let buffer;
  try {
    buffer = Buffer.from(data, "base64");
  } catch (_) {
    return sendJson(res, 400, { error: "Image payload could not be decoded" });
  }

  if (!buffer.length) return sendJson(res, 400, { error: "Image payload cannot be empty" });
  if (buffer.length > MAX_IMAGE_BYTES) return sendJson(res, 400, { error: "Image must be under 1 MB" });

  const baseName = path.basename(filename, path.extname(filename)) || "lesson-image";
  const safeName = baseName.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "lesson-image";
  const storedName = `${safeName}-${Date.now()}${ALLOWED_IMAGE_TYPES[contentType]}`;
  const outputPath = path.join(UPLOADS_DIR, storedName);

  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(outputPath, buffer);
    return sendJson(res, 200, { ok: true, path: `/assets/uploads/${storedName}`, size: buffer.length });
  } catch (_) {
    return sendJson(res, 500, { error: "Could not save uploaded image" });
  }
}

async function handleEblocksChat(req, res) {
  if (!GEMINI_API_KEY) {
    return sendJson(res, 503, { error: "AI assistant is not configured on the server" });
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.ok) {
    return sendJson(res, 429, {
      error: "Too many chat requests. Please wait a moment and try again.",
      retryAfterMs: rateLimit.retryAfterMs
    });
  }

  let body;
  try {
    body = await readJsonBody(req, { maxBytes: MAX_CHAT_BODY_BYTES });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Invalid JSON body" });
  }

  const rawMessage = typeof body.message === "string" ? body.message : "";
  const message = rawMessage.trim();
  if (!message) {
    return sendJson(res, 400, { error: "message is required" });
  }

  try {
    const normalized = normalizeChatPayload(body);
    const { requestBody, warnings } = buildGeminiChatRequest(normalized);
    const result = await callGeminiGenerateContent(requestBody);

    return sendJson(res, 200, {
      reply: result.reply,
      usage: result.usage,
      warnings
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return sendJson(res, 504, { error: "AI assistant timed out. Please try again." });
    }
    if (error && error.code === "GEMINI_UPSTREAM") {
      console.error("Gemini upstream error:", {
        status: error.status || null,
        details: error.details || null
      });
      return sendJson(res, 502, { error: "AI assistant is temporarily unavailable. Please try again." });
    }
    console.error("Gemini chat error:", error);
    return sendJson(res, 500, { error: "AI assistant request failed" });
  }
}

function isAuthorized(req) {
  const tokenHeader = String(req.headers["x-admin-token"] || "").trim();
  const authHeader = String(req.headers.authorization || "").trim();
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const token = tokenHeader || bearer;
  return token && token === ADMIN_TOKEN;
}

async function readJsonBody(req, options = {}) {
  const chunks = [];
  let total = 0;
  const maxBytes = typeof options.maxBytes === "number" ? options.maxBytes : MAX_IMAGE_BYTES * 2;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request body is too large");
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("Request body cannot be empty");
  return JSON.parse(raw);
}

async function readTextBody(req, options = {}) {
  const chunks = [];
  let total = 0;
  const maxBytes = typeof options.maxBytes === "number" ? options.maxBytes : MAX_IMAGE_BYTES * 4;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request body is too large");
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("Request body cannot be empty");
  return raw;
}


const CSV_SCHEMAS = {
  topics: {
    headers: [
      "id",
      "name",
      "subject",
      "domain",
      "level",
      "estimated_minutes",
      "hardware_tags",
      "image",
      "images",
      "content_outcomes_html",
      "content_explain_html",
      "content_practice_html",
      "content_assessment_html"
    ],
    toRow: (topic) => [
      topic.id || "",
      topic.name || "",
      topic.subject || "",
      topic.domain || "",
      topic.level || "",
      topic.estimated_minutes ?? "",
      Array.isArray(topic.hardware_tags) ? topic.hardware_tags.join("|") : "",
      topic.image || "",
      Array.isArray(topic.images) ? topic.images.join("|") : "",
      topic.content?.outcomes_html || "",
      topic.content?.explain_html || "",
      topic.content?.practice_html || "",
      topic.content?.assessment_html || ""
    ],
    fromRow: (row) => {
      const content = {
        outcomes_html: row.content_outcomes_html || "",
        explain_html: row.content_explain_html || "",
        practice_html: row.content_practice_html || "",
        assessment_html: row.content_assessment_html || ""
      };
      const hasContent = Object.values(content).some((val) => val && String(val).trim());
      return {
        id: row.id || undefined,
        name: row.name || "",
        subject: row.subject || "",
        domain: row.domain || "",
        level: row.level || "",
        estimated_minutes: row.estimated_minutes ? Number(row.estimated_minutes) : undefined,
        hardware_tags: splitList(row.hardware_tags),
        image: row.image || undefined,
        images: splitList(row.images),
        ...(hasContent ? { content } : {})
      };
    }
  },
  hardware: {
    headers: ["sku", "name", "supports_tags", "learners_per_kit", "notes", "image"],
    toRow: (item) => [
      item.sku || "",
      item.name || "",
      Array.isArray(item.supports_tags) ? item.supports_tags.join("|") : "",
      item.learners_per_kit ?? "",
      item.notes || "",
      item.image || ""
    ],
    fromRow: (row) => ({
      sku: row.sku || "",
      name: row.name || "",
      supports_tags: splitList(row.supports_tags),
      learners_per_kit: row.learners_per_kit ? Number(row.learners_per_kit) : undefined,
      notes: row.notes || "",
      image: row.image || ""
    })
  },
  templates: {
    headers: ["id", "name", "intended_duration", "blocks_json"],
    toRow: (tpl) => [
      tpl.id || "",
      tpl.name || "",
      tpl.intended_duration ?? "",
      JSON.stringify(tpl.blocks || [])
    ],
    fromRow: (row) => ({
      id: row.id || "",
      name: row.name || "",
      intended_duration: row.intended_duration ? Number(row.intended_duration) : undefined,
      blocks: parseJsonList(row.blocks_json)
    })
  }
};

function buildCsvForKey(key, data) {
  const schema = CSV_SCHEMAS[key];
  const rows = [schema.headers, ...data.map(schema.toRow)];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function parseCsvForKey(key, records) {
  const schema = CSV_SCHEMAS[key];
  if (!schema) throw new Error("Unknown CSV schema");
  return records.map(schema.fromRow).filter((row) => Object.keys(row).length > 0);
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJsonList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/["\n\r,]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === '
') {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (ch === '
') {
      continue;
    }

    field += ch;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows.shift().map((h) => h.trim()).filter(Boolean);
  return rows
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => {
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = (row[idx] ?? "").trim();
      });
      return record;
    });
}

async function serveStatic(pathname, res) {
  if (pathname === "/favicon.ico") {
    return sendFile(res, path.join(ROOT_DIR, "assets", "matrix-icon.ico"));
  }

  // Dashboard
  if (pathname === "/" || pathname === "/index.html") {
    return sendFile(res, path.join(ROOT_DIR, "dashboard", "index.html"));
  }
  // SOW Generator
  if (pathname === "/sow-generator" || pathname === "/sow-generator/") {
    return sendFile(res, path.join(ROOT_DIR, "sow-generator", "index.html"));
  }
  if (pathname === "/review.html") {
    return sendFile(res, path.join(ROOT_DIR, "sow-generator", "review.html"));
  }
  if (pathname === "/admin.html") {
    return sendFile(res, path.join(ROOT_DIR, "sow-generator", "admin.html"));
  }
  if (pathname === "/hardware.html") {
    return sendFile(res, path.join(ROOT_DIR, "sow-generator", "hardware.html"));
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(ROOT_DIR, safePath);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    return await sendFile(res, filePath);
  } catch (_) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

async function sendFile(res, filePath) {
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300"
    });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(String(payload));
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (forwarded) return forwarded;
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function checkRateLimit(clientIp) {
  const now = Date.now();
  const current = chatRateLimits.get(clientIp);
  const recentHits = current ? current.hits.filter((hit) => now - hit < CHAT_WINDOW_MS) : [];

  if (recentHits.length >= CHAT_MAX_REQUESTS) {
    const oldest = recentHits[0];
    return {
      ok: false,
      retryAfterMs: Math.max(CHAT_WINDOW_MS - (now - oldest), 1000)
    };
  }

  recentHits.push(now);
  chatRateLimits.set(clientIp, { hits: recentHits });

  if (chatRateLimits.size > 500) {
    for (const [key, entry] of chatRateLimits.entries()) {
      if (!entry.hits.length || now - entry.hits[entry.hits.length - 1] > CHAT_WINDOW_MS) {
        chatRateLimits.delete(key);
      }
    }
  }

  return { ok: true };
}

function normalizeChatPayload(body) {
  const warnings = [];
  const editorCode = trimText(body.editorCode, 12000, warnings, "Editor code was trimmed.");
  const boardType = trimText(body.boardType, 120, warnings);
  const serialContext = trimText(body.serialContext, 3000, warnings, "Serial context was trimmed.");
  const worksheet = normalizeWorksheet(body.worksheet, warnings);
  const conversation = normalizeConversation(body.conversation, warnings);
  const message = trimText(body.message, 2000, warnings, "Prompt was trimmed.");

  return {
    message,
    editorCode,
    boardType,
    serialContext,
    worksheet,
    conversation,
    warnings
  };
}

function normalizeWorksheet(worksheet, warnings) {
  if (!worksheet || typeof worksheet !== "object") return null;

  const code = trimText(worksheet.code, 120, warnings);
  const title = trimText(worksheet.title, 200, warnings);
  const text = trimText(worksheet.text, 8000, warnings, "Worksheet context was trimmed.");

  if (!code && !title && !text) return null;
  return { code, title, text };
}

function normalizeConversation(conversation, warnings) {
  if (!Array.isArray(conversation)) return [];

  const limited = conversation
    .slice(-8)
    .map((entry) => {
      const role = entry && entry.role === "assistant" ? "assistant" : "user";
      const content = trimText(entry && entry.content, 1500, warnings, "Conversation history was trimmed.");
      return content ? { role, content } : null;
    })
    .filter(Boolean);

  if (conversation.length > limited.length) {
    warnings.push("Older conversation history was dropped.");
  }

  return limited;
}

function trimText(value, maxLength, warnings, warningMessage) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (text.length <= maxLength) return text;
  if (warningMessage && warnings) warnings.push(warningMessage);
  return `${text.slice(0, maxLength)}\n...[truncated]`;
}

function buildGeminiChatRequest(payload) {
  const warnings = [...payload.warnings];
  const sections = [
    `User question:\n${payload.message}`,
    payload.boardType ? `Board type:\n${payload.boardType}` : "",
    payload.editorCode ? `Current editor code:\n\`\`\`cpp\n${payload.editorCode}\n\`\`\`` : "",
    payload.serialContext ? `Recent serial monitor output:\n${payload.serialContext}` : ""
  ];

  if (payload.worksheet) {
    const worksheetHeader = [payload.worksheet.code, payload.worksheet.title].filter(Boolean).join(" - ");
    sections.push(`Open worksheet${worksheetHeader ? ` (${worksheetHeader})` : ""}:\n${payload.worksheet.text || ""}`.trim());
  }

  sections.push("Answer for the Matrix TSL E-blocks IDE. Be concise, practical, and explicit about hardware assumptions.");

  const contents = [];
  for (const entry of payload.conversation) {
    contents.push({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.content }]
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: sections.filter(Boolean).join("\n\n") }]
  });

  return {
    warnings,
    requestBody: {
      systemInstruction: {
        parts: [
          {
            text:
              "You are the E-blocks AI assistant for Matrix TSL. You are talking to a 16-year-old student who is learning microcontrollers. Your job is to teach them how microcontroller programming works. Keep responses brief, clear, friendly, and not too technical. Use simple language first, then only add small amounts of technical detail when needed. Help with Arduino Mega, ESP32, Firmata, serial monitor troubleshooting, combo board logic, and worksheet tutoring. Give practical steps and short examples. Explain hardware assumptions explicitly. Do not invent unsupported libraries or APIs. Distinguish between interpreted browser IDE behavior and code that requires running on a physical board."
          }
        ]
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024
      }
    }
  };
}

async function callGeminiGenerateContent(requestBody) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("Gemini upstream request failed");
      error.code = "GEMINI_UPSTREAM";
      error.status = response.status;
      error.details = data && data.error ? data.error : null;
      throw error;
    }

    const reply = extractGeminiText(data);
    if (!reply) {
      const error = new Error("Gemini returned no text");
      error.code = "GEMINI_UPSTREAM";
      throw error;
    }

    return {
      reply,
      usage: data.usageMetadata || null
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractGeminiText(data) {
  const candidate = data && Array.isArray(data.candidates) ? data.candidates[0] : null;
  const parts = candidate && candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  const text = parts
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return text;
}
