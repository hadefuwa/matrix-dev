# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PI-308 Production Test Results App** — a browser-based replacement for an Excel-based production test reporting workflow at Matrix TSL. Production staff open the app, complete a step-by-step test checklist for one product, and export the result as a JSON file.

**Live app:** https://hadefuwa.github.io/IM-test-procedures  
**Repo:** https://github.com/hadefuwa/IM-test-procedures (public)  
**Author:** Hamed Adefuwa — Electrical Engineering Product Manager

## Current State (v0.1 / v0.2)

The app is a single self-contained file: [index.html](index.html). No build step, no dependencies beyond two Google Fonts. Hosted on GitHub Pages directly from the `master` branch root.

### What is built
- Three test procedure tabs: **IM0004** (Closed Loop Systems, 51 steps), **IM3214** (Locktronics PLC LOGO Board, 26 steps), **IM6930** (PLC Fundamentals Trainer, 51 steps)
- All step criteria sourced directly from the Excel workbooks — nothing invented
- Header fields: Report ID (auto-generated), Date (auto-filled), Operator Name, Product Name, Serial Number, Build Reference
- Per-step: Pass/Fail dropdown, Comments, Sign Off (click to auto-fill initials from Operator Name)
- Overall result scoped to the active tab only — each procedure is fully independent
- Save Draft → localStorage, Load Draft to restore
- Export JSON → downloads `PI-308_[PROCEDURE]_[SN]_[DATE]_[ID].json`
- Required fields banner (operator, product, serial number must be filled)
- Matrix TSL dark logo in header; product photo card at top of each tab
- Fully responsive

### What is not yet built (from plan.md)
- **Phase 7** — Backend API (Node.js/Express): no server exists, saves are local browser downloads only
- **Phase 8** — PDF/Excel export (JSON only so far)
- **Phase 9** — Review/summary page before final submission
- **Phase 10** — NAS storage integration (requires backend + IT)
- **Phase 11** — Authentication
- **Phase 12** — Report history and search
- **Phase 14** — Company domain deployment (`production-results.matrixtsl.co.uk` or similar)

## Architecture

```
index.html  (all HTML + CSS + JS in one file)
assets/
  matrix dark.png     ← header logo (white text, for dark background)
  matrix light.png    ← logo variant (not currently used)
  im0004-1.png        ← product photo for IM0004 tab
  im3214.png          ← product photo for IM3214 tab
  IM6930.png          ← product photo for IM6930 tab
  IM3490.png          ← spare (not currently used)
```

No `package.json`, no build tooling, no backend. Everything runs client-side.

## Key Code Locations (index.html)

- **`PROCEDURES` object** — all test step data for all three procedures. Edit this to add, remove or change steps. Each entry has `code`, `subtitle`, `image`, and `sections[]` → `steps[]` with `id` and `criteria`.
- **`buildPanel(tab)`** — renders the product hero card and step table for a tab
- **`activeTab`** — tracks which procedure is currently shown; scopes `updateOverall()` and `collectData()` to that tab only
- **`autoSignOff(el)`** — click handler on Sign Off cells; derives initials from Operator Name
- **`checkRequiredFields()`** — shows/hides the orange warning banner
- **`exportJSON()`** — validates, calls `collectData()`, triggers browser file download
- **`saveDraft()` / `loadDraft()`** — persists to `localStorage` under key `pi308_draft`
- **`pi308_seq`** in localStorage — auto-incrementing report ID counter

## Data Model (exported JSON)

```json
{
  "procedure": "IM0004",
  "reportId": "PI-308-0001",
  "createdAt": "2026-06-09T10:30:00Z",
  "date": "2026-06-09",
  "operator": "Hamed Adefuwa",
  "product": "Closed Loop Systems",
  "serialNumber": "SN12345",
  "buildReference": "BLD-2026-001",
  "overallResult": "PASS",
  "sections": {
    "1. Documentation Verification": [
      { "step": "1.1", "criteria": "...", "comments": "", "result": "PASS", "signOff": "HA" }
    ]
  },
  "comments": ""
}
```

## Next Milestone

The logical next step is **Phase 7 — Backend API**. This requires:
1. A Node.js/Express server (or equivalent) hosted on the company network
2. IT to provision a hosting location with HTTPS
3. A restricted service account with write access to the NAS results folder
4. Replacing the current browser JSON download with a `POST /api/reports/submit` call

Until IT requirements are confirmed, the current GitHub Pages version is usable for manual testing and process validation with production staff.

## Fonts

- `Barlow Condensed` — headings, labels, badges
- `Barlow` — body text
- `JetBrains Mono` — step numbers, report ID display
