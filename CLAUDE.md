# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Matrix Apps — a monolithic Node.js server hosting five internal web apps for Matrix TSL (engineering education equipment manufacturer). All apps are vanilla-JS SPAs with no build step. Live at https://matrixtsl.dev, deployed automatically to Railway on push to `main`.

## Commands

```bash
npm start                              # Run the server (default port 3000)
node document-splitter/build-all.js   # Regression test for document-splitter (must report 32 blocks, 66 checks, 0 failures)
```

No build step, no lint step, no test runner beyond `build-all.js`.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `ADMIN_TOKEN` | — | Bearer token for write endpoints (PUT /api/*, POST /api/upload-image) |
| `GEMINI_API_KEY` | — | Google Gemini API key for AI chat |
| `DATA_DIR` | `./data` | Directory for JSON data files |
| `IMAGE_UPLOAD_DIR` | `./assets/uploads` | Directory for uploaded images |
| `SITE_USERNAME` | `admin` | Legacy basic-auth username (no longer used by the request handler) |
| `SITE_PASSWORD` | — | Legacy basic-auth password (no longer used by the request handler) |
| `GATE_PASSWORD` | `matrix123` | Password for the site gate (see below). |

## Architecture

**`server.js`** is the entire backend — raw Node.js `http` module, no framework. It handles static file serving, all API routes, the site password gate, rate limiting, and Gemini AI proxying.

**Site password gate.** Every path except the public `/industrial-maintenance-usp/` page (plus `/favicon.*` and `/api/health`) requires the gate password. Unauthorized page requests get a custom gate page (notice that this is not the official Matrix TSL site, a link to the USP page, and a password box hidden behind two clicks); unauthorized `/api/*` requests get a 401. `POST /api/site-auth` with `{ "password": "..." }` validates against `GATE_PASSWORD` and, on success, sets the `matrix_site_auth` HttpOnly cookie (30-day, `Secure` behind HTTPS). The cookie value is `sha256("matrix-dev-gate::" + GATE_PASSWORD)`, so it is not the password itself.

**Data** is stored as flat JSON files in `data/` (`topics.json`, `hardware.json`, `templates.json`). No database.

**Apps** are static directories served by `server.js`:

| Route | Directory | Description |
|---|---|---|
| `/` | `dashboard/` | Home page with app cards |
| `/sow-generator` | `sow-generator/` | Scheme of Work builder (lesson planning with AI chat) |
| `/eblocks` | `eblocks/` | Block-based Arduino IDE with serial monitor and AI tutor |
| `/scorm-example` | `scorm-example/` | SCORM workflow builder (DOCX → SCORM packages) |
| `/document-splitter` | `document-splitter/` | Browser-side DOCX parser and SCORM packager |
| `/sf2-portal` | `sf2-portal/` | Static SF2 reference portal |
| `/im-portal` | `im-portal/` | Static IM reference portal |
| `/im-test-procedures` | `im-test-procedures/` | Industrial Maintenance production test reporting app |

## API endpoints

All write endpoints require `X-Admin-Token` or `Authorization: Bearer <token>` header matching `ADMIN_TOKEN`.

- `GET/PUT /api/topics` — curriculum topic tree (also accepts `?format=csv`)
- `GET/PUT /api/hardware` — hardware kit catalog
- `GET/PUT /api/templates` — SoW template structure
- `POST /api/upload-image` — base64 PNG/JPEG upload (max 1 MB) → saves to `assets/uploads/`
- `POST /api/sow/chat` — Gemini AI lesson planning assistant (rate-limited: 12 req / 5 min per IP)
- `POST /api/eblocks/chat` — Gemini AI microcontroller tutor (same rate limit)
- `POST /api/eblocks/upload` — Arduino compile & upload via local `arduino-cli`
- `GET /api/health` — server status
- `POST /api/reports/submit` — save a completed IM test report to `data/reports.json` (no auth required — open to production staff)
- `GET /api/reports/export` — all reports as CSV (summary columns: Report ID, Date, Submitted At, Operator, Product, Serial Number, Build Reference, Procedure, Overall Result, Total Steps, Steps Passed, Steps Failed, Comments)
- `GET /api/reports/export/detail` — all reports flattened to one row per step as CSV (columns: Report ID, Date, Submitted At, Operator, Serial Number, Procedure, Overall Result, Section, Step, Criteria, Result, Comments, Sign Off)

## Key implementation notes

- **No bundler anywhere.** All frontend JS is vanilla; CDN-loaded libraries (JSZip, TinyMCE) are referenced directly in HTML.
- **Client-side processing.** DOCX parsing, SCORM packaging, and block editing all run in the browser, not on the server.
- **`data/topics.json`** is 1,352 lines. When editing topic structure, preserve the existing schema exactly — the SoW generator depends on it.
- **`document-splitter/`** has its own detailed `CLAUDE.md` covering its tagging rules, media handling, and regression test invariants. Read it before touching that module.
- **`eblocks/`** includes local firmware binaries and a jscpp C++ interpreter shim. Don't touch `vendor/` or `firmware/` without knowing what you're doing.
- **Gemini model** used is `gemini-2.5-flash-lite` (set in `server.js`).
- **`data/reports.json`** stores all submitted IM test reports as a flat JSON array. Each entry includes top-level summary fields plus a `sections` object containing the full step-by-step breakdown. This file is the server-side buffer — the Excel workbook is the permanent record.
- **`im-test-procedures/`** has its own `CLAUDE.md` covering the test procedure data, UI patterns, and report submission flow. Read it before touching that module.

## IM Test Reports Excel Workbook

The Excel reporter (`IM Test Reports.xlsm` on the user's Desktop) is a macro-enabled workbook that pulls live data from the server via VBA — no Power Query, no Microsoft cloud services, no admin rights required. It was the only viable approach given corporate IT restrictions blocking Power Automate, Make.com, and Azure portal access.

**How it works:**

1. A VBA module (`ReportRefresh`) is embedded in the workbook at creation time using PowerShell COM automation and the `VBProject.VBComponents.Import()` API.
2. Clicking **Refresh Reports** calls `RefreshAllReports()`, which fires two HTTP GET requests using `WinHttp.WinHttpRequest.5.1` (a built-in Windows COM object — no dependencies).
3. The CSV responses are parsed entirely in VBA with a hand-rolled parser that handles quoted fields and embedded commas correctly.
4. **Summary sheet** — all reports as rows, header row dark navy, PASS/FAIL cells colour-coded via conditional formatting applied programmatically.
5. **Per-report tabs** — one tab per unique Report ID, named by report ID. Each tab shows a header block (Report ID, Date, Operator, Serial Number, Procedure, Overall Result) followed by steps grouped under section banners, with Result cells individually colour-coded green/red.
6. Tabs are created or cleared-and-rewritten on each refresh, so the workbook accumulates the permanent record even if the server's `data/reports.json` is reset by a Railway deploy.

**Key constraints solved:**
- `cDate` is a reserved VBA function name — the date column variable is named `cDt`.
- Sheet-safe names strip the characters `/ \ ? * [ ] :` using individual `Replace()` calls (a single string containing all of them triggers Windows path-removal hooks in PowerShell).
- `AddFormControl(0, ...)` creates a Button; `1` creates a CheckBox — easy to mix up.
- The `.bas` file must begin with `Attribute VB_Name = "ModuleName"` or Excel imports it as `Module1`, breaking any `ModuleName.SubName` OnAction references.
