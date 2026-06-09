# Industrial Maintenance Test — Production Report App

A browser-based production test reporting system for Matrix TSL. Production staff open the app, work through a step-by-step test checklist for an IM product, and submit the completed report to a live server. A macro-enabled Excel workbook pulls all submitted reports automatically — no cloud services, no admin rights, no extra software required.

**Live app:** https://matrixtsl.dev/im-test-procedures  
**Author:** Hamed Adefuwa — Electrical Engineering Product Manager, Matrix TSL

---

## What it does

Production staff open the app in any browser, select the correct test procedure tab, fill in the header fields (operator name, serial number, build reference), and work through each test step pressing **Pass**, **Fail**, or **N/A**. Pressing Pass or Fail automatically signs off the step with the operator's initials. When every step has a result and a sign-off, the green **Submit Report** button becomes active. Submitting sends the report to the server instantly.

On the management side, opening `IM Test Reports.xlsm` and clicking **Refresh Reports** pulls every submitted report from the server and builds the workbook automatically — a **Summary** sheet with all reports, and one individual tab per report showing the full step-by-step breakdown.

---

## Test procedures

| Tab | Product | Steps |
|---|---|---|
| IM0004 | Closed Loop Systems | 51 |
| IM3214 | Locktronics PLC LOGO Board | 26 |
| IM6930 | PLC Fundamentals Trainer | 51 |

---

## App features

- **Pass / Fail / N/A toggle buttons** — one tap per step, colour-coded green/red
- **Auto sign-off** — pressing Pass or Fail fills the sign-off cell with the operator's initials instantly
- **Report ID derived from serial number** — format `IM-{productcode}-{serialNumber}` (e.g. `IM-6930-SN12345`)
- **Save Draft / Load Draft** — persists work in browser localStorage so the tab can be closed and resumed
- **Submission validation** — blocks Submit if any step is missing a result or sign-off, with a specific error message
- **Overall result** — calculated automatically from step results; shows PASS only if zero FAILs

---

## System architecture

```
Production staff (browser)
        │
        │  POST /api/reports/submit  (JSON payload)
        ▼
matrixtsl.dev  (Railway — Node.js server)
        │
        │  stores to data/reports.json
        │
        ├──  GET /api/reports/export         → summary CSV
        └──  GET /api/reports/export/detail  → step-level CSV
                        │
                        │  HTTP GET (WinHTTP, built into Windows)
                        ▼
              IM Test Reports.xlsm
              (Excel VBA — on any PC with internet access)
```

---

## The Excel reporter — how it works

This is the most technically interesting part of the system. The goal was a live Excel workbook that any manager could open and see all submitted reports, with individual tabs per report, without requiring Power Automate, SharePoint connectors, Power BI, Azure, or any Microsoft cloud service — all of which were blocked by corporate IT.

### The solution: embedded VBA + Windows HTTP

Excel's macro language (VBA) has direct access to `WinHttp.WinHttpRequest.5.1`, a COM object built into every copy of Windows. This means a macro can make a plain HTTPS GET request to any URL and read the response as a string — no browser, no plugins, no external libraries.

The workbook was built using PowerShell COM automation:

```powershell
$excel = New-Object -ComObject Excel.Application
$wb = $excel.Workbooks.Add()
$comp = $wb.VBProject.VBComponents.Import("im_reports_vba.bas")
$wb.SaveAs($path, 52)  # 52 = .xlsm macro-enabled format
```

The VBA module is written to a `.bas` file and imported directly into the workbook's VBA project. Once saved as `.xlsm`, the macro lives inside the file permanently — the workbook is fully self-contained and can be copied anywhere.

### What the macro does on Refresh

**Step 1 — Fetch summary CSV**

```vb
Dim http As Object
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
http.Open "GET", "https://matrixtsl.dev/api/reports/export", False
http.Send
' http.ResponseText now contains the full CSV
```

**Step 2 — Parse CSV in VBA**

A hand-rolled CSV parser handles quoted fields, embedded commas, and escaped double-quotes correctly — the kind of edge cases that break a naive `Split(line, ",")` approach.

**Step 3 — Populate Summary sheet**

- Row 1: dark navy title banner ("IM Test Reports")
- Row 2: Refresh button area
- Row 3: column headers (white text on dark background)
- Row 4+: one row per submitted report
- Conditional formatting applied programmatically: PASS cells → green, FAIL cells → red

**Step 4 — Fetch detail CSV and build per-report tabs**

The detail endpoint returns one row per test step across all reports. The macro groups rows by Report ID, and for each unique ID:

1. Creates a new sheet (or clears the existing one) named after the Report ID
2. Writes a header block: Report ID, Date, Operator, Serial Number, Procedure, Overall Result
3. Groups steps under section banner rows (merged cells, light blue background)
4. Writes each step: step number, criteria, result, comments, sign-off
5. Colours individual Result cells green (PASS) or red (FAIL)
6. Auto-fits columns, sets the Criteria column to a fixed 55-character width

### Why this approach beats the alternatives

| Approach | Problem |
|---|---|
| Power Automate | Premium licence required — blocked |
| Make.com + OneDrive | OneDrive for Business connector needs admin approval — blocked |
| Azure Logic Apps | Corporate IT blocked Azure portal (401 error) |
| Power Query "From Web" | Works but creates static snapshot only — no per-report tabs |
| SharePoint list | Requires IT provisioning and SharePoint licence |
| **VBA + WinHTTP** | **No licence, no admin rights, no cloud services, works on any Windows PC with internet access** |

### Key gotchas (documented so they're not hit again)

- **`cDate` is a reserved VBA function name** — the date column index variable must be named something else (e.g. `cDt`) or the module won't compile.
- **`AddFormControl(0, ...)` = Button; `(1, ...)` = CheckBox** — easy to mix up and produces a silent wrong result.
- **The `.bas` file must start with `Attribute VB_Name = "ModuleName"`** — without this line, Excel imports the module as `Module1`, breaking any `ModuleName.SubName` macro references (e.g. the button's `OnAction` property).
- **Sheet-name sanitisation must use individual `Replace()` calls** — building a string of all illegal characters (`/\?*[]:`) triggers Windows path-removal security hooks in PowerShell when the script is run.
- **Registry flag required to inject VBA via COM** — `HKCU\SOFTWARE\Microsoft\Office\16.0\Excel\Security\AccessVBOM` must be set to `1` before the workbook is created, then restored afterwards.

---

## Report data model

```json
{
  "reportId": "IM-6930-SN12345",
  "date": "2026-06-09",
  "submittedAt": "2026-06-09T14:32:00.000Z",
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

---

## API endpoints (on matrixtsl.dev)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/reports/submit` | None | Submit a completed report |
| `GET` | `/api/reports/export` | None | All reports as summary CSV |
| `GET` | `/api/reports/export/detail` | None | All reports flattened to step-level CSV |

---

## File structure

```
im-test-procedures/
├── index.html        ← entire app (HTML + CSS + JS, single file)
├── CLAUDE.md         ← guidance for AI-assisted development
├── README.md         ← this file
└── assets/
    ├── matrix dark.png   ← header logo
    ├── im0004-1.png      ← product photo (IM0004 tab)
    ├── im3214.png        ← product photo (IM3214 tab)
    └── IM6930.png        ← product photo (IM6930 tab)
```

---

## Key code locations (index.html)

| Symbol | Purpose |
|---|---|
| `PROCEDURES` | All test step data for all three procedures — edit here to add/change steps |
| `buildPanel(tab)` | Renders the product hero card and step table for a tab |
| `onResultBtn(btn, tab)` | Handles Pass/Fail/N/A toggle; auto-fills sign-off initials |
| `submitReport()` | Validates, collects data, POSTs to `/api/reports/submit` |
| `validate()` | Blocks submission if header fields, step results, or sign-offs are missing |
| `collectData()` | Gathers all step results and sign-offs into the JSON payload |
| `refreshReportId()` | Derives report ID live from serial number field |
| `saveDraft() / loadDraft()` | localStorage persistence under key `pi308_draft` |

---

## Fonts

- `Barlow Condensed` — headings, labels, badges
- `Barlow` — body text
- `JetBrains Mono` — step numbers, report ID display
