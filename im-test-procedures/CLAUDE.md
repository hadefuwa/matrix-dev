# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Industrial Maintenance Test** — a browser-based production test reporting app for Matrix TSL. Production staff complete step-by-step test checklists and submit reports to a live server. A macro-enabled Excel workbook pulls all submitted reports automatically via VBA + WinHTTP.

**Live app:** https://matrixtsl.dev/im-test-procedures  
**Author:** Hamed Adefuwa — Electrical Engineering Product Manager

## Current State

The app is a single self-contained file: `index.html`. No build step, no dependencies beyond two Google Fonts. Served by the matrix-dev Node.js server at `matrixtsl.dev`.

### What is built

- Three test procedure tabs: **IM0004** (Closed Loop Systems, 51 steps), **IM3214** (Locktronics PLC LOGO Board, 26 steps), **IM6930** (PLC Fundamentals Trainer, 51 steps)
- Header fields: Report ID (auto-derived from serial number as `IM-{code}-{serial}`), Date (auto-filled), Operator Name, Product Name, Serial Number, Build Reference
- Per-step: Pass/Fail/N/A toggle buttons (green/red), Comments, Sign Off (auto-filled with operator initials on Pass/Fail)
- Overall result calculated automatically — PASS only if zero FAILs
- Save Draft → localStorage, Load Draft to restore
- Submit Report → POST to `/api/reports/submit` — blocked until all steps have a result and sign-off
- Submission validation: missing header fields, pending steps, unsigned steps each produce a specific error message

### Server-side report storage

Reports are saved to `data/reports.json` on the matrix-dev server (see main `CLAUDE.md` for endpoint details). The file is a flat JSON array; each entry has top-level summary fields plus a `sections` object with full step-by-step detail.

## Architecture

```
index.html  (all HTML + CSS + JS in one file)
assets/
  matrix dark.png   ← header logo
  im0004-1.png      ← product photo for IM0004 tab
  im3214.png        ← product photo for IM3214 tab
  IM6930.png        ← product photo for IM6930 tab
```

No `package.json`, no build tooling. Served statically by the parent matrix-dev `server.js`.

## Key Code Locations (index.html)

- **`PROCEDURES` object** — all test step data for all three procedures. Each entry has `code`, `subtitle`, `image`, and `sections[]` → `steps[]` with `id` and `criteria`. Edit here to add, remove or change steps.
- **`buildPanel(tab)`** — renders the product hero card and step table for a tab
- **`onResultBtn(btn, tab)`** — handles Pass/Fail/N/A toggle; auto-fills sign-off with operator initials on Pass/Fail (only if sign-off is currently empty)
- **`submitReport()`** — async; validates, collects data, POSTs full payload including `sections` to `/api/reports/submit`
- **`validate()`** — checks required header fields, then checks all steps have a non-PENDING result, then checks all sign-off inputs are filled; shows specific banner message for each failure
- **`collectData()`** — gathers all step results, comments, and sign-offs into the JSON payload
- **`refreshReportId()`** — derives report ID live from active tab + serial number field; updates both display and hidden input
- **`buildReportId(tab, serial)`** — `'IM-' + productCode + '-' + sanitisedSerial`
- **`saveDraft()` / `loadDraft()`** — persists to `localStorage` under key `pi308_draft`
- **`activeTab`** — tracks which procedure is active; scopes all queries, `updateOverall()`, and `collectData()` to that tab only

## Data Model (submitted JSON payload)

```json
{
  "reportId": "IM-6930-SN12345",
  "date": "2026-06-09",
  "operator": "Hamed Adefuwa",
  "product": "PLC Fundamentals Trainer",
  "serialNumber": "SN12345",
  "buildReference": "BLD-2026-001",
  "procedure": "IM6930",
  "overallResult": "PASS",
  "totalSteps": 51,
  "stepsPassed": 51,
  "stepsFailed": 0,
  "comments": "",
  "sections": {
    "1. Power Supply": [
      { "step": "1.1", "criteria": "24V DC supply present", "result": "PASS", "comments": "", "signOff": "HA" }
    ]
  }
}
```

## Result button pattern

Each step row has a `<div class="result-group" data-tab data-step data-section data-result="PENDING">` container. The three buttons (Pass, Fail, N/A) toggle the `.active` class and update `data-result`. Clicking the already-active button resets to PENDING. `collectData()` reads `data-result` from each group.

## Validation rules (in order)

1. Operator Name, Product Name, Serial Number must be non-empty
2. All `.result-group[data-tab]` elements must have `data-result !== 'PENDING'`
3. All `.signoff-input[data-tab]` elements must have a non-empty value

## Fonts

- `Barlow Condensed` — headings, labels, badges
- `Barlow` — body text
- `JetBrains Mono` — step numbers, report ID display
