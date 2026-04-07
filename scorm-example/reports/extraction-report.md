# Extraction Report — CP4807: Introduction to Microcontrollers
**Source:** `source/CP4807 - Introduction to microcontrollers 05 04 26.docx`
**Stage:** 2 — Extraction
**Depends on:** `reports/analysis-report.md`
**Run date:** 2026-04-06

---

## Summary

| Item | Count |
|---|---|
| Total blocks eligible for extraction | 32 |
| Blocks extracted (full run, projected) | 30 |
| Blocks extracted (this prototype run) | 2 |
| Blocks skipped — duplicate filename | 1 |
| Blocks deferred — teacher content | 3 |
| Blocks deferred — missing extension | 1 |
| Warnings carried forward from analysis | 5 |
| New extraction errors | 0 |

> **Prototype note:** This is a partial extraction run. Two blocks have been extracted as real files to validate the pipeline. The full block inventory (30 extractable blocks) is documented below with expected output paths. A full extraction pass should be run once Warning W2 (duplicate CP4807-1.doc) is resolved in the source document.

---

## Files Created — This Run

| File | Source tag | Destination | Status |
|---|---|---|---|
| `outputs/extracted/CP4807-1.txt` | `<worksheet>` | `outputs/extracted/` | ✓ Created |
| `outputs/extracted/CP4807-H1.txt` | `<HTML>` | `outputs/extracted/` | ✓ Created |

---

## Files Skipped — This Run

| Block | Filename | Reason |
|---|---|---|
| Block 3 | `CP4807-1.doc` (first occurrence) | ⚠ Duplicate filename — W2. First occurrence (preparation notes) deferred. Only second occurrence (Worksheet 1 learner content) extracted. |
| Block 32 | `CP4807-CPDcert` | ⚠ Missing file extension — W3. Deferred until confirmed. |
| Blocks 16, 30, 31 | `CP4807-TN.htm`, `CP4807-marking scheme.htm`, `CP4807-SOW.htm` | ⚠ Teacher content — W5. Not extracted into learner output folders. Deferred for teacher-facing build pass. |

---

## Full Extraction Inventory — Projected Output Paths

### WORKSHEET blocks → `outputs/extracted/` + `outputs/docx/`

| Block | Filename | Extracted text | Built DOCX target | Status |
|---|---|---|---|---|
| 2 | `CP4807-Cont.doc` | `outputs/extracted/CP4807-Cont.txt` | `outputs/docx/CP4807-Cont.html` | Pending full run |
| 3 | `CP4807-1.doc` *(prep)* | `outputs/extracted/CP4807-prep.txt` | `outputs/docx/CP4807-prep.html` | Pending — rename in source first |
| **4** | **`CP4807-1.doc`** | **`outputs/extracted/CP4807-1.txt`** | **`outputs/docx/CP4807-1.html`** | **✓ Done** |
| 5 | `CP4807-2.doc` | `outputs/extracted/CP4807-2.txt` | `outputs/docx/CP4807-2.html` | Pending full run |
| 6 | `CP4807-3.doc` | `outputs/extracted/CP4807-3.txt` | `outputs/docx/CP4807-3.html` | Pending full run |
| 7 | `CP4807-4.doc` | `outputs/extracted/CP4807-4.txt` | `outputs/docx/CP4807-4.html` | Pending full run |
| 8 | `CP4807-5.doc` | `outputs/extracted/CP4807-5.txt` | `outputs/docx/CP4807-5.html` | Pending full run |
| 9 | `CP4807-6.doc` | `outputs/extracted/CP4807-6.txt` | `outputs/docx/CP4807-6.html` | Pending full run |
| 10 | `CP4807-7.doc` | `outputs/extracted/CP4807-7.txt` | `outputs/docx/CP4807-7.html` | Pending full run |
| 11 | `CP4807-8.doc` | `outputs/extracted/CP4807-8.txt` | `outputs/docx/CP4807-8.html` | Pending full run |
| 12 | `CP4807-9.doc` | `outputs/extracted/CP4807-9.txt` | `outputs/docx/CP4807-9.html` | Pending full run |
| 13 | `CP4807-10.doc` | `outputs/extracted/CP4807-10.txt` | `outputs/docx/CP4807-10.html` | Pending full run |
| 14 | `CP4807-11.doc` | `outputs/extracted/CP4807-11.txt` | `outputs/docx/CP4807-11.html` | Pending full run |
| 15 | `CP4807-12.doc` | `outputs/extracted/CP4807-12.txt` | `outputs/docx/CP4807-12.html` | Pending full run |

### HTML blocks → `outputs/extracted/` + `outputs/html/`

| Block | Filename | Extracted text | Built HTML target | Status |
|---|---|---|---|---|
| 16 | `CP4807-TN.htm` | `outputs/extracted/CP4807-TN.txt` | `outputs/html/CP4807-TN.htm` | Deferred — teacher content |
| **17** | **`CP4807-H1.html`** | **`outputs/extracted/CP4807-H1.txt`** | **`outputs/html/CP4807-H1.html`** | **✓ Done** |
| 18 | `CP4807-H2.htm` | `outputs/extracted/CP4807-H2.txt` | `outputs/html/CP4807-H2.htm` | Pending full run |
| 19 | `CP4807-H3.htm` | `outputs/extracted/CP4807-H3.txt` | `outputs/html/CP4807-H3.htm` | Pending full run |
| 20 | `CP4807-H4.htm` | `outputs/extracted/CP4807-H4.txt` | `outputs/html/CP4807-H4.htm` | Pending full run |
| 21 | `CP4807-H5.htm` | `outputs/extracted/CP4807-H5.txt` | `outputs/html/CP4807-H5.htm` | Pending full run |
| 22 | `CP4807-H6.htm` | `outputs/extracted/CP4807-H6.txt` | `outputs/html/CP4807-H6.htm` | Pending full run |
| 23 | `CP4807-H7.htm` | `outputs/extracted/CP4807-H7.txt` | `outputs/html/CP4807-H7.htm` | Pending full run |
| 24 | `CP4807-H8.htm` | `outputs/extracted/CP4807-H8.txt` | `outputs/html/CP4807-H8.htm` | Pending full run |
| 25 | `CP4807-H9.htm` | `outputs/extracted/CP4807-H9.txt` | `outputs/html/CP4807-H9.htm` | Pending full run |
| 26 | `CP4807-A1.htm` | `outputs/extracted/CP4807-A1.txt` | `outputs/html/CP4807-A1.htm` | Pending full run |
| 27 | `CP4807-A2.htm` | `outputs/extracted/CP4807-A2.txt` | `outputs/html/CP4807-A2.htm` | Pending full run |
| 28 | `CP4807-A3.htm` | `outputs/extracted/CP4807-A3.txt` | `outputs/html/CP4807-A3.htm` | Pending full run |
| 29 | `CP4807-P1.htm` | `outputs/extracted/CP4807-P1.txt` | `outputs/html/CP4807-P1.htm` | Pending full run |
| 30 | `CP4807-marking scheme.htm` | `outputs/extracted/CP4807-marking-scheme.txt` | `outputs/html/CP4807-marking-scheme.htm` | Deferred — teacher content |
| 31 | `CP4807-SOW.htm` | `outputs/extracted/CP4807-SOW.txt` | `outputs/html/CP4807-SOW.htm` | Deferred — teacher content |

### DOCUMENT blocks → `outputs/extracted/` + `outputs/docx/`

| Block | Filename | Extracted text | Built DOCX target | Status |
|---|---|---|---|---|
| 32 | `CP4807-CPDcert` *(no ext)* | `outputs/extracted/CP4807-CPDcert.txt` | `outputs/docx/CP4807-CPDcert.html` | Deferred — W3 (missing extension) |

---

## Warnings Carried Forward

All five warnings from `analysis-report.md` remain open. No new warnings from extraction.

| Warning | ID | Status |
|---|---|---|
| Ambiguous double tag on cover page | W1 | Open — treated as worksheet |
| Duplicate filename CP4807-1.doc | W2 | Open — first occurrence deferred |
| Missing extension on CPDcert | W3 | Open — block deferred |
| Curly quotes in filename tags | W4 | Open — no extraction impact |
| Teacher content in HTML blocks | W5 | Open — blocks deferred |

---

## Recommended Next Step

1. Resolve W2 in source document: rename preparation notes block to `CP4807-prep.doc`.
2. Resolve W3: add `.docx` extension to `CP4807-CPDcert` filename tag.
3. Run full extraction pass using `prompt-02-extract.md`.
4. Proceed to build stage using `prompt-03-build.md`.
