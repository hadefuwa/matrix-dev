const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT_DIR, "data"));
const UPLOADS_DIR = path.resolve(process.env.IMAGE_UPLOAD_DIR || path.join(ROOT_DIR, "assets", "uploads"));
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || "").trim();
const SITE_USERNAME = (process.env.SITE_USERNAME || "admin").trim();
const SITE_PASSWORD = (process.env.SITE_PASSWORD || "").trim();
// Site password gate — protects the whole site except the public Industrial Maintenance USP page.
const GATE_PASSWORD = (process.env.GATE_PASSWORD || "matrix123").trim();
const GATE_COOKIE_NAME = "matrix_site_auth";
const GATE_TOKEN = crypto.createHash("sha256").update(`matrix-dev-gate::${GATE_PASSWORD}`).digest("hex");
const GATE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const GATE_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Matrix Development Site</title>
  <link rel="icon" href="/favicon.ico">
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(1200px 600px at 50% -10%, #14243a 0%, #0b1320 55%, #080d16 100%);
      color: #e6edf6;
    }
    .card {
      width: 100%;
      max-width: 520px;
      background: rgba(17, 26, 41, 0.92);
      border: 1px solid rgba(120, 150, 190, 0.18);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
    }
    h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: 0.2px; }
    .sub { margin: 0 0 20px; color: #93a3b8; font-size: 13px; }
    .alert {
      border: 1px solid rgba(245, 180, 80, 0.45);
      background: rgba(245, 180, 80, 0.10);
      border-radius: 12px;
      padding: 16px 18px;
      font-size: 14px;
      line-height: 1.55;
    }
    .alert strong { color: #ffd28a; }
    .alert a { color: #ffd28a; }
    .actions { margin-top: 20px; display: grid; gap: 10px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 13px 16px;
      border-radius: 10px;
      border: 1px solid transparent;
      font-size: 14px; font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .btn-primary { background: #2f6fed; color: #fff; }
    .btn-primary:hover { background: #2a63d4; }
    .btn-ghost { background: transparent; border-color: rgba(120, 150, 190, 0.3); color: #cdd8e6; }
    .btn-ghost:hover { border-color: rgba(120, 150, 190, 0.55); }
    .divider { margin: 22px 0 0; border-top: 1px solid rgba(120, 150, 190, 0.14); }
    .access-link {
      margin-top: 14px;
      text-align: center;
    }
    .access-link button {
      background: none; border: none; color: #6f8197;
      font-size: 12px; cursor: pointer; text-decoration: underline; padding: 4px;
    }
    .access-link button:hover { color: #93a3b8; }
    .hidden { display: none !important; }
    .login { margin-top: 16px; }
    .login label { display: block; font-size: 12px; color: #93a3b8; margin-bottom: 6px; }
    .login input {
      width: 100%; padding: 12px 14px; border-radius: 10px;
      border: 1px solid rgba(120, 150, 190, 0.3);
      background: #0d1626; color: #e6edf6; font-size: 14px;
    }
    .login input:focus { outline: none; border-color: #2f6fed; }
    .err { color: #ff8a8a; font-size: 13px; margin-top: 10px; min-height: 16px; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Matrix Development Site</h1>
    <p class="sub">Internal work in progress</p>

    <div class="alert">
      <strong>This is not the official Matrix TSL website.</strong><br>
      This is a site used to host development work. If you have found yourself here by mistake,
      please go to <a href="https://www.matrixtsl.com/">www.matrixtsl.com</a>.
    </div>

    <div class="actions">
      <a class="btn btn-primary" href="/industrial-maintenance-usp/">
        Industrial Maintenance USP information &rarr;
      </a>
    </div>

    <div class="divider"></div>

    <div class="access-link">
      <button type="button" id="reveal-1">Staff / developer access</button>
    </div>

    <div class="access-link hidden" id="step-2">
      <button type="button" id="reveal-2">Continue to login</button>
    </div>

    <form class="login hidden" id="login-form" autocomplete="off">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" autocomplete="off" spellcheck="false">
      <div class="err" id="err" role="alert"></div>
      <button type="submit" class="btn btn-primary" style="margin-top:12px;">Enter</button>
    </form>
  </main>

  <script>
    (function () {
      var r1 = document.getElementById("reveal-1");
      var step2 = document.getElementById("step-2");
      var r2 = document.getElementById("reveal-2");
      var form = document.getElementById("login-form");
      var pw = document.getElementById("password");
      var err = document.getElementById("err");

      r1.addEventListener("click", function () {
        r1.parentElement.classList.add("hidden");
        step2.classList.remove("hidden");
      });
      r2.addEventListener("click", function () {
        step2.classList.add("hidden");
        form.classList.remove("hidden");
        pw.focus();
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        err.textContent = "";
        fetch("/api/site-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw.value })
        }).then(function (res) {
          if (res.ok) { window.location.reload(); return; }
          return res.json().then(function (data) {
            err.textContent = (data && data.error) || "Incorrect password.";
            pw.value = "";
            pw.focus();
          });
        }).catch(function () {
          err.textContent = "Something went wrong. Please try again.";
        });
      });
    })();
  </script>
</body>
</html>`;
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

    // Password gate: allow the public USP page through, gate everything else.
    if (pathname === "/api/site-auth") {
      if (req.method === "POST") return handleSiteAuth(req, res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }
    if (!isPublicPath(pathname) && !isGateAuthorized(req)) {
      if (pathname.startsWith("/api/")) {
        return sendJson(res, 401, { error: "This area is password protected." });
      }
      return sendGatePage(res);
    }

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

    if (pathname === "/api/sow/chat") {
      if (req.method === "POST") return handleSowChat(req, res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (pathname === "/api/eblocks/upload") {
      if (req.method === "POST") return handleArduinoUpload(req, res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (pathname === "/api/upload-image") {
      if (req.method === "POST") return handleImageUpload(req, res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (pathname === "/api/reports/submit") {
      if (req.method === "POST") return handleReportSubmit(req, res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (pathname === "/api/reports/export/detail") {
      if (req.method === "GET") return handleReportsDetailExport(res);
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (pathname === "/api/reports/export") {
      if (req.method === "GET") return handleReportsExport(res);
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

const REPORTS_FILE = path.join(DATA_DIR, "reports.json");

async function handleReportSubmit(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (_) {
    return sendJson(res, 400, { error: "Invalid JSON" });
  }

  const row = {
    reportId:       String(body.reportId      || ""),
    date:           String(body.date          || ""),
    submittedAt:    new Date().toISOString(),
    operator:       String(body.operator      || ""),
    product:        String(body.product       || ""),
    serialNumber:   String(body.serialNumber  || ""),
    buildReference: String(body.buildReference|| ""),
    procedure:      String(body.procedure     || ""),
    overallResult:  String(body.overallResult || ""),
    totalSteps:     Number(body.totalSteps    || 0),
    stepsPassed:    Number(body.stepsPassed   || 0),
    stepsFailed:    Number(body.stepsFailed   || 0),
    comments:       String(body.comments      || ""),
    sections:       body.sections             || {},
  };

  let reports = [];
  try {
    reports = JSON.parse(await fs.readFile(REPORTS_FILE, "utf8"));
  } catch (_) {}

  reports.push(row);
  await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2));
  return sendJson(res, 200, { ok: true, reportId: row.reportId });
}

async function handleReportsDetailExport(res) {
  let reports = [];
  try {
    reports = JSON.parse(await fs.readFile(REPORTS_FILE, "utf8"));
  } catch (_) {}

  const escape = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const headers = [
    "Report ID","Date","Submitted At","Operator","Serial Number",
    "Procedure","Overall Result","Section","Step","Criteria","Result","Comments","Sign Off"
  ];
  const lines = [headers.map(escape).join(",")];

  reports.forEach(r => {
    const prefix = [r.reportId, r.date, r.submittedAt, r.operator, r.serialNumber, r.procedure, r.overallResult];
    const sections = r.sections || {};
    Object.entries(sections).forEach(([sectionTitle, steps]) => {
      if (!Array.isArray(steps)) return;
      steps.forEach(s => {
        lines.push([
          ...prefix.map(escape),
          escape(sectionTitle),
          escape(s.step),
          escape(s.criteria),
          escape(s.result),
          escape(s.comments),
          escape(s.signOff),
        ].join(","));
      });
    });
  });

  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="im-test-reports-detail.csv"',
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(lines.join("\r\n"));
}

async function handleReportsExport(res) {
  let reports = [];
  try {
    reports = JSON.parse(await fs.readFile(REPORTS_FILE, "utf8"));
  } catch (_) {}

  const cols = ["reportId","date","submittedAt","operator","product","serialNumber","buildReference","procedure","overallResult","totalSteps","stepsPassed","stepsFailed","comments"];
  const headers = ["Report ID","Date","Submitted At","Operator","Product","Serial Number","Build Reference","Procedure","Overall Result","Total Steps","Steps Passed","Steps Failed","Comments"];

  const escape = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const lines = [
    headers.map(escape).join(","),
    ...reports.map(r => cols.map(c => escape(r[c])).join(","))
  ];

  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="im-test-reports.csv"',
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(lines.join("\r\n"));
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

async function handleSowChat(req, res) {
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

  let topicsSummary = "";
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, JSON_FILES.topics), "utf8");
    const topics = JSON.parse(raw);
    if (Array.isArray(topics)) {
      topicsSummary = topics
        .map((t) => `- ${t.name} (${[t.subject, t.domain, t.level].filter(Boolean).join(", ")})`)
        .join("\n");
    }
  } catch (_) {}

  const conversation = normalizeConversation(body.conversation || [], []);
  const trimmedMessage = trimText(message, 2000, []);

  const contents = [];
  for (const entry of conversation) {
    contents.push({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.content }]
    });
  }
  contents.push({ role: "user", parts: [{ text: trimmedMessage }] });

  const requestBody = {
    systemInstruction: {
      parts: [{
        text: `You are a helpful assistant for Matrix TSL, a UK company that manufactures engineering education equipment used by 16–21 year old students at colleges and universities. You are speaking with a college or university professor who is building a Scheme of Work using the Matrix TSL Scheme of Work Generator tool.\n\nHelp them select appropriate topics for their course, understand what each topic covers, and structure a well-balanced scheme of work. Be friendly, professional, and concise. If they describe their course or student level, suggest relevant topics from the list below.\n\nAvailable topics in the tool:\n${topicsSummary || "No topics currently available."}`
      }]
    },
    contents,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1024
    }
  };

  try {
    const result = await callGeminiGenerateContent(requestBody);
    return sendJson(res, 200, { reply: result.reply, usage: result.usage });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return sendJson(res, 504, { error: "AI assistant timed out. Please try again." });
    }
    if (error && error.code === "GEMINI_UPSTREAM") {
      console.error("SOW chat upstream error:", { status: error.status, details: error.details });
      return sendJson(res, 502, { error: "AI assistant is temporarily unavailable. Please try again." });
    }
    console.error("SOW chat error:", error);
    return sendJson(res, 500, { error: "AI assistant request failed" });
  }
}

async function handleArduinoUpload(req, res) {
  let body;
  try {
    body = await readJsonBody(req, { maxBytes: 256 * 1024 });
  } catch (e) {
    return sendJson(res, 400, { error: e.message || "Invalid body" });
  }

  const code = typeof body.code === "string" ? body.code : "";
  const fqbn = typeof body.fqbn === "string" ? body.fqbn.trim() : "";
  const port = typeof body.port === "string" ? body.port.trim() : "";

  if (!code) return sendJson(res, 400, { error: "code is required" });
  if (!fqbn) return sendJson(res, 400, { error: "fqbn is required" });

  const sketchName = `eb3sketch_${Date.now()}`;
  const sketchDir = path.join(os.tmpdir(), sketchName);
  const sketchFile = path.join(sketchDir, `${sketchName}.ino`);

  try {
    await fs.mkdir(sketchDir, { recursive: true });
    await fs.writeFile(sketchFile, code, "utf8");

    const outputLines = [];

    // Compile
    outputLines.push("[Compile] Compiling sketch...\n");
    const compileResult = await runArduinoCli(["compile", "--fqbn", fqbn, sketchDir]);
    outputLines.push(compileResult.output);

    if (compileResult.exitCode !== 0) {
      return sendJson(res, 200, {
        ok: false,
        output: outputLines.join(""),
        error: "Compilation failed"
      });
    }

    outputLines.push("[Upload] Uploading to board...\n");

    // Auto-detect port if not provided
    let uploadPort = port;
    if (!uploadPort) {
      const listResult = await runArduinoCli(["board", "list", "--format", "json"]);
      try {
        const boards = JSON.parse(listResult.stdout);
        const ports = Array.isArray(boards.detected_ports) ? boards.detected_ports
          : Array.isArray(boards) ? boards : [];
        const match = ports.find((b) => b.matching_boards && b.matching_boards.length > 0)
          || ports[0];
        if (match && match.port && match.port.address) {
          uploadPort = match.port.address;
          outputLines.push(`[Upload] Detected port: ${uploadPort}\n`);
        }
      } catch (_) {}
    }

    if (!uploadPort) {
      return sendJson(res, 200, {
        ok: false,
        output: outputLines.join(""),
        error: "No board port found. Connect the board and try again."
      });
    }

    const uploadResult = await runArduinoCli(["upload", "-p", uploadPort, "--fqbn", fqbn, sketchDir]);
    outputLines.push(uploadResult.output);

    const ok = uploadResult.exitCode === 0;
    return sendJson(res, 200, {
      ok,
      output: outputLines.join(""),
      error: ok ? null : "Upload failed"
    });

  } catch (e) {
    return sendJson(res, 500, { error: e.message || "Upload error" });
  } finally {
    fs.rm(sketchDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runArduinoCli(args, timeoutMs = 120000) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = execFile("arduino-cli", args);
    } catch (e) {
      resolve({ exitCode: 1, output: e.message, stdout: "" });
      return;
    }

    const lines = [];
    let stdout = "";

    proc.stdout.on("data", (d) => {
      const s = d.toString();
      lines.push(s);
      stdout += s;
    });
    proc.stderr.on("data", (d) => lines.push(d.toString()));

    const timer = setTimeout(() => {
      proc.kill();
      resolve({ exitCode: 1, output: lines.join("") + "\n[Timed out after 120s]", stdout });
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, output: lines.join(""), stdout });
    });

    proc.on("error", (e) => {
      clearTimeout(timer);
      const msg = e.code === "ENOENT"
        ? "arduino-cli not found. Please install it and ensure it is in your PATH."
        : e.message;
      resolve({ exitCode: 1, output: msg, stdout: "" });
    });
  });
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

    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (ch === "\r") {
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
  // SCORM Example
  if (pathname === "/scorm-example" || pathname === "/scorm-example/") {
    return sendFile(res, path.join(ROOT_DIR, "scorm-example", "index.html"));
  }
  if (pathname.startsWith("/scorm-example/")) {
    const relativePath = pathname.slice("/scorm-example/".length);
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const scopedPath = path.join(ROOT_DIR, "scorm-example", normalized);
    return sendFile(res, scopedPath);
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
    const headers = {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
      "X-Robots-Tag": "noindex, nofollow"
    };

    res.writeHead(200, headers);

    if (ext === ".html") {
      return res.end(injectRobotsMetaTag(data));
    }

    res.end(data);
  } catch (error) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow"
    });
    res.end("Not Found");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow"
  });
  res.end(String(payload));
}

function injectRobotsMetaTag(htmlBuffer) {
  const html = htmlBuffer.toString("utf8");
  if (html.includes('name="robots"')) return html;
  return html.replace(
    /<head([^>]*)>/i,
    `<head$1>\n  <meta name="robots" content="noindex, nofollow">`
  );
}

// Paths reachable without the site password.
function isPublicPath(pathname) {
  if (pathname === "/industrial-maintenance-usp" || pathname.startsWith("/industrial-maintenance-usp/")) return true;
  if (pathname === "/favicon.ico" || pathname === "/favicon.png") return true;
  if (pathname === "/api/health") return true;
  return false;
}

function readCookie(req, name) {
  const header = String(req.headers.cookie || "");
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return "";
}

function isGateAuthorized(req) {
  return readCookie(req, GATE_COOKIE_NAME) === GATE_TOKEN;
}

function isSecureRequest(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  return proto === "https";
}

async function handleSiteAuth(req, res) {
  let body;
  try {
    body = await readJsonBody(req, { maxBytes: 4 * 1024 });
  } catch (_) {
    return sendJson(res, 400, { error: "Invalid request." });
  }

  const submitted = typeof body.password === "string" ? body.password : "";
  if (submitted !== GATE_PASSWORD) {
    return sendJson(res, 401, { error: "Incorrect password." });
  }

  const cookieParts = [
    `${GATE_COOKIE_NAME}=${GATE_TOKEN}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${GATE_MAX_AGE}`
  ];
  if (isSecureRequest(req)) cookieParts.push("Secure");

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Set-Cookie": cookieParts.join("; "),
    "X-Robots-Tag": "noindex, nofollow"
  });
  res.end(JSON.stringify({ ok: true }));
}

function sendGatePage(res) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow"
  });
  res.end(GATE_PAGE_HTML);
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
