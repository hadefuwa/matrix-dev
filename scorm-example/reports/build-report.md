# Build Report — CP4807: Introduction to Microcontrollers
**Source:** `source/CP4807 - Introduction to microcontrollers 05 04 26.docx`
**Stage:** 3 — Build
**Depends on:** `reports/extraction-report.md`
**Run date:** 2026-04-06

---

## Summary

| Item | Count |
|---|---|
| DOCX outputs built (this prototype run) | 1 |
| HTML outputs built (this prototype run) | 1 |
| DOCX outputs pending (full run) | 13 |
| HTML outputs pending (full run) | 13 |
| Browser course built | No — pending full extraction |
| Build errors | 0 |
| Build warnings | 1 |

> **Prototype note:** Two outputs have been built from real source content to validate the build pipeline. The remaining 26 blocks are documented with their expected output paths. A full build pass should follow a full extraction run.

---

## Files Built — This Run

### HTML outputs

| File | Source block | Extracted from | Status |
|---|---|---|---|
| `outputs/html/CP4807-H1.html` | Homework 1 — Traffic light junction | `outputs/extracted/CP4807-H1.txt` | ✓ Built |

**CP4807-H1.html** — Homework assignment. Renders as a styled learner-facing HTML page. Contains: covered worksheets list, design brief, hardware pin mapping table (Port A/B traffic light connections), software instructions, timing sequence (RED 20s, AMBER 3s, GREEN 20s), and junction rule. Planning tags and wrapper tags removed. Teacher notes excluded.

### DOCX outputs (built as HTML stand-ins)

> DOCX generation requires python-docx or equivalent. For this prototype run, outputs are produced as styled HTML documents with a build note banner. Content and structure are identical to what a DOCX build would contain.

| File | Source block | Extracted from | Status |
|---|---|---|---|
| `outputs/docx/CP4807-1.html` | Worksheet 1 — First program | `outputs/extracted/CP4807-1.txt` | ✓ Built |

**CP4807-1.html** — Learner worksheet. Renders as a print-style A4 document. Contains: commands introduced (OUTPUT, LOOP, DELAY), video reference, Over to you instructions, numbered challenge list, hints, and example access instructions. Planning tags and wrapper tags removed.

---

## Build Warnings

**BW1 — DOCX outputs produced as HTML**
Python-docx is not available in the current environment. DOCX outputs have been produced as styled HTML files with a `.html` extension. The filename convention (`CP4807-1.html`) matches the intended build target filename (`CP4807-1.doc`) for tracking purposes.
To produce genuine `.docx` files, run with python-docx installed or use a Word-compatible conversion step.

---

## Full Build Inventory — Projected Outputs (after full extraction run)

### DOCX outputs → `outputs/docx/`

| Target file | Content | Classification |
|---|---|---|
| `CP4807-Cont.html` | Contents listing | Learner content |
| `CP4807-prep.html` | Preparation notes (after rename) | Learner content |
| `CP4807-1.html` | Worksheet 1: First program | ✓ Built |
| `CP4807-2.html` | Worksheet 2: Performing calculations | Pending |
| `CP4807-3.html` | Worksheet 3: Using connection points | Pending |
| `CP4807-4.html` | Worksheet 4: Digital inputs | Pending |
| `CP4807-5.html` | Worksheet 5: Making decisions | Pending |
| `CP4807-6.html` | Worksheet 6: Macros / subroutines | Pending |
| `CP4807-7.html` | Worksheet 7: Using prototype boards | Pending |
| `CP4807-8.html` | Worksheet 8: Colour graphical displays | Pending |
| `CP4807-9.html` | Worksheet 9: Pin interrupts | Pending |
| `CP4807-10.html` | Worksheet 10: Timer interrupts | Pending |
| `CP4807-11.html` | Worksheet 11: Touch control systems | Pending |
| `CP4807-12.html` | Worksheet 12: Web mirror | Pending |
| `CP4807-CPDcert.html` | CPD certificate | Pending (W3 unresolved) |

### HTML outputs → `outputs/html/`

| Target file | Content | Classification |
|---|---|---|
| `CP4807-H1.html` | Homework 1: Traffic light junction | ✓ Built |
| `CP4807-H2.htm` | Homework 2: Colour display extension | Pending |
| `CP4807-H3.htm` | Homework 3: Light sensor display | Pending |
| `CP4807-H4.htm` | Homework 4: Accelerometer level | Pending |
| `CP4807-H5.htm` | Homework 5: Work on Assessment 2 | Pending — minimal content |
| `CP4807-H6.htm` | Homework 6: DC motor control | Pending |
| `CP4807-H7.htm` | Homework 7: Stopwatch | Pending |
| `CP4807-H8.htm` | Homework 8: Touch project | Pending — minimal content |
| `CP4807-H9.htm` | Homework 9–10: Project planning | Pending |
| `CP4807-A1.htm` | Assessment 1: Traffic lights | Pending |
| `CP4807-A2.htm` | Assessment 2: Temperature controller | Pending |
| `CP4807-A3.htm` | Assessment 3: Touch temp controller | Pending |
| `CP4807-P1.htm` | Project: Student-led project brief | Pending |

### Teacher-facing outputs (separate build pass required)

| Target file | Content |
|---|---|
| `outputs/html/CP4807-TN.htm` | Teacher's notes |
| `outputs/html/CP4807-marking-scheme.htm` | Assessment marking scheme |
| `outputs/html/CP4807-SOW.htm` | Scheme of work — 60 hours |

### Browser course

Not yet attempted. Requires:
- All 12 learner worksheets extracted and built
- Confirmed course structure and navigation order
- Index page template defined

The Bronze/Silver/Gold structure in the source document suggests a natural three-part navigation structure.

---

## Recommended Next Step

1. Resolve W2 and W3 in source document.
2. Run full extraction pass.
3. Run full build pass using `prompt-03-build.md`.
4. Run validation using `prompt-04-package-scorm.md` or a dedicated validation prompt.
