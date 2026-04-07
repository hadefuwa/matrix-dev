# Analysis Report — CP4807: Introduction to Microcontrollers
**Source:** `source/CP4807 - Introduction to microcontrollers 05 04 26.docx`
**Stage:** 1 — Analysis only. No output files generated.
**Run date:** 2026-04-06

---

## Summary

| Item | Count |
|---|---|
| Total tagged blocks found | 32 |
| Unique filenames resolved | 31 |
| Duplicate filenames flagged | 1 |
| Blocks with missing filename | 0 |
| Blocks with missing file extension | 1 |
| Blocks with ambiguous/double tags | 1 |
| Warnings | 5 |
| Errors | 0 |
| SCORM tags found | 0 |
| SCORM readiness | Not ready |

---

## Tagged Blocks — Full Inventory

### WORKSHEET blocks → intended output: .doc / .docx

| # | Filename | Content title | Classification | Notes |
|---|---|---|---|---|
| 1 | `CP4807-head.doc` | Introduction to Microcontrollers (cover) | Learner content | ⚠ Double tag: both `<HTML>` and `<worksheet>` present. Treated as worksheet. |
| 2 | `CP4807-Cont.doc` | Contents page | Learner content | Lists Bronze/Silver/Gold worksheets |
| 3 | `CP4807-1.doc` | Preparation notes | Learner content | ⚠ Duplicate filename — first occurrence (preparation block) |
| 4 | `CP4807-1.doc` | Worksheet 1: First program | Learner content | ⚠ Duplicate filename — second occurrence (worksheet block) |
| 5 | `CP4807-2.doc` | Worksheet 2: Performing calculations | Learner content | Binary, hex, variables, counters |
| 6 | `CP4807-3.doc` | Worksheet 3: Using connection points | Learner content | Connection points and loops |
| 7 | `CP4807-4.doc` | Worksheet 4: Digital inputs | Learner content | Switches, Boolean variables |
| 8 | `CP4807-5.doc` | Worksheet 5: Making decisions | Learner content | IF statements, SWITCH commands |
| 9 | `CP4807-6.doc` | Worksheet 6: Macros / subroutines | Learner content | Hardware macros, software macros |
| 10 | `CP4807-7.doc` | Worksheet 7: Using prototype boards | Learner content | Breadboard circuits, AND logic |
| 11 | `CP4807-8.doc` | Worksheet 8: Colour graphical displays | Learner content | GUI panels, graphs, bitmaps |
| 12 | `CP4807-9.doc` | Worksheet 9: Pin interrupts | Learner content | Interrupt service routines |
| 13 | `CP4807-10.doc` | Worksheet 10: Timer interrupts | Learner content | Hardware timers, clock logic |
| 14 | `CP4807-11.doc` | Worksheet 11: Touch control systems | Learner content | Touch screen, DC_touched macro |
| 15 | `CP4807-12.doc` | Worksheet 12: Web mirror | Learner content | EB3 Web Mirror, WiFi, QR code, mobile control |

### HTML blocks → intended output: .htm

| # | Filename | Content title | Classification | Notes |
|---|---|---|---|---|
| 16 | `CP4807-TN.htm` | Teacher's notes | Teacher content | Pedagogy, hardware list, scheme summary — must not be published to learner output |
| 17 | `CP4807-H1.html` | Homework 1: Traffic lights design brief | Homework | Worksheets 1–4; full hardware and software brief |
| 18 | `CP4807-H2.htm` | Homework 2: Colour graphical display extension | Homework | Worksheets 5–7 |
| 19 | `CP4807-H3.htm` | Homework 3: Light sensor display program | Homework | Cross-workbook (Sensors module) |
| 20 | `CP4807-H4.htm` | Homework 4: Accelerometer level display | Homework | Cross-workbook (Sensors module) |
| 21 | `CP4807-H5.htm` | Homework 5: Work on Assessment 2 | Homework | Very short — single instruction only |
| 22 | `CP4807-H6.htm` | Homework 6: DC motor speed control | Homework | Potentiometer + motor direction |
| 23 | `CP4807-H7.htm` | Homework 7: Stopwatch program | Homework | Timer interrupts, graphical display |
| 24 | `CP4807-H8.htm` | Homework 8: Touch project continuation | Homework | Minimal content — references worksheet challenge section |
| 25 | `CP4807-H9.htm` | Homework 9–10: Project planning | Homework | Design brief, hardware, software, technical risk |
| 26 | `CP4807-A1.htm` | Assessment 1: Traffic lights | Assessment | In-classroom; supervised from scratch |
| 27 | `CP4807-A2.htm` | Assessment 2: Temperature controller | Assessment | 6-hour mini project; partial homework |
| 28 | `CP4807-A3.htm` | Assessment 3: Touch temperature controller | Assessment | 6-hour mini project; extends Assessment 2 |
| 29 | `CP4807-P1.htm` | Project: Student-led open project | Project brief | Full design brief, hardware, software, risk |
| 30 | `CP4807-marking scheme.htm` | Assessment marking scheme | Teacher content | Bronze/Silver/Gold criteria — teacher use only |
| 31 | `CP4807-SOW.htm` | Scheme of work — 60-hour module | Teacher content | 28 sessions across multiple workbooks |

### DOCUMENT blocks → intended output: .docx

| # | Filename | Content title | Classification | Notes |
|---|---|---|---|---|
| 32 | `CP4807-CPDcert` | CPD certificate | Certificate | ⚠ Missing file extension. Assumed `.docx`. Needs confirming. |

---

## Filename List

All filenames resolved from `<filename>` tags in the source document:

```
CP4807-head.doc
CP4807-Cont.doc
CP4807-1.doc          ← DUPLICATE (two separate blocks share this filename)
CP4807-2.doc
CP4807-3.doc
CP4807-4.doc
CP4807-5.doc
CP4807-6.doc
CP4807-7.doc
CP4807-8.doc
CP4807-9.doc
CP4807-10.doc
CP4807-11.doc
CP4807-12.doc
CP4807-TN.htm
CP4807-H1.html
CP4807-H2.htm
CP4807-H3.htm
CP4807-H4.htm
CP4807-H5.htm
CP4807-H6.htm
CP4807-H7.htm
CP4807-H8.htm
CP4807-H9.htm
CP4807-A1.htm
CP4807-A2.htm
CP4807-A3.htm
CP4807-P1.htm
CP4807-marking scheme.htm
CP4807-SOW.htm
CP4807-CPDcert         ← MISSING EXTENSION
```

---

## Warnings

**W1 — Ambiguous double tag on cover page**
Block 1 (`CP4807-head.doc`) opens with both `<HTML>` and `<worksheet>` simultaneously.
The agent has treated this as a `<worksheet>` (DOCX output) based on the `.doc` filename extension.
Recommendation: remove the stray `<HTML>` tag from the cover page block, or rename the file to `.htm` if HTML output is intended.

**W2 — Duplicate filename: `CP4807-1.doc`**
Two separate blocks share the filename `CP4807-1.doc`:
- Block 3: preparation notes (resource references, IMPORTANT notice)
- Block 4: Worksheet 1 — First program (content, challenges, hints)

These are likely intended to be combined into a single document. In extraction, the second block will overwrite the first unless handled explicitly.
Recommendation: rename one block — for example, `CP4807-prep.doc` for the preparation notes and `CP4807-1.doc` for Worksheet 1.

**W3 — Missing file extension: `CP4807-CPDcert`**
The `<Document>` block for the CPD certificate has no file extension in its `<filename>` tag.
The agent has assumed `.docx` but this should be confirmed.
Recommendation: update the filename to `CP4807-CPDcert.docx` in the source document.

**W4 — Curly / Unicode quotation marks in filename tags**
All `<filename>` tags in the source document use Unicode "curly quotes" (`"` / `"`) rather than straight ASCII double quotes (`"`).
This will not affect content extraction but may cause issues if filenames are read directly from raw tag text by a parser expecting ASCII.
Recommendation: replace with straight quotes in all `<filename>` tags.

**W5 — Teacher content in HTML blocks**
The following HTML blocks contain teacher-only content and must not be published as learner-facing outputs:
- `CP4807-TN.htm` — Teacher's notes (pedagogy, hardware list, full scheme)
- `CP4807-marking scheme.htm` — Assessment marking scheme
- `CP4807-SOW.htm` — Scheme of work

These are valid outputs for a teacher-facing build but should be separated from learner-facing output folders.

---

## Errors

None. All 32 blocks have a `<filename>` tag (or a partial one) and a recognisable tag type. No blocks are entirely unresolvable.

---

## Content Classifications

| Classification | Count | Files |
|---|---|---|
| Learner content (worksheets) | 14 | CP4807-1.doc through CP4807-12.doc + head + Cont |
| Homework | 9 | CP4807-H1 through CP4807-H9 |
| Assessment | 3 | CP4807-A1, A2, A3 |
| Project brief | 1 | CP4807-P1 |
| Certificate | 1 | CP4807-CPDcert |
| Teacher content | 4 | CP4807-TN, SOW, marking scheme, CP4807-head (partial) |

---

## SCORM Readiness Observations

| Check | Result |
|---|---|
| SCORM tags in source | None found |
| Manifest data | None |
| Launch file defined | No |
| SCO structure defined | No |
| SCORM version specified | No |
| Completion logic defined | No |
| Sequencing logic defined | No |
| Navigation model defined | No |

**Assessment:**
The source document contains no SCORM-specific markup, manifest data, or launch definitions. The document is not SCORM-ready in its current state.

However, the document has strong structural characteristics that would support SCORM packaging with additional specification:
- Clear module progression: Bronze (WS 1–7) → Silver (WS 8–10) → Gold (WS 11–12)
- Defined assessment points at sessions 10, 13–14, and 22
- Consistent activity format (video → example → challenges → hints)
- A 60-hour scheme of work with 28 sessions
- 3 formal assessments with marking criteria

If SCORM packaging is a future goal, the following decisions need to be made explicitly:
1. SCORM version (1.2 or 2004)
2. Launch structure (single SCO or one SCO per worksheet)
3. Completion model (by launch, by page view, or by assessment submission)
4. Tracking model (completion status, progress measure, or score reporting)
5. Navigation model (free or linear)

**Recommendation:** Do not attempt SCORM packaging at this stage. Complete extraction and build first.

---

## Recommended Next Step

Resolve Warning W2 (duplicate CP4807-1.doc) before running extraction. All other warnings can be addressed in parallel with extraction.

Run Stage 2 using `prompt-02-extract.md`.
