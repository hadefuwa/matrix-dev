# Validation Report — CP4807: Introduction to Microcontrollers
**Source:** `source/CP4807 - Introduction to microcontrollers 05 04 26.docx`
**Stage:** 4 — Validation (partial — prototype run)
**Run date:** 2026-04-06

---

## Summary

| Check | Result |
|---|---|
| Files present vs expected | 2 of 28 learner outputs built (prototype run) |
| Files missing (full run) | 26 — pending full extraction and build |
| Duplicate filenames | 1 open warning (W2) |
| Broken references | None detected in built outputs |
| Unresolved blocks | 2 (W2 duplicate, W3 missing extension) |
| Teacher content in learner folders | None — correctly deferred |
| SCORM packaging ready | No |

---

## File Presence Checks

### Built outputs — present

| File | Expected | Present | Notes |
|---|---|---|---|
| `outputs/extracted/CP4807-1.txt` | Yes | Yes | Worksheet 1 extracted text |
| `outputs/extracted/CP4807-H1.txt` | Yes | Yes | Homework 1 extracted text |
| `outputs/html/CP4807-H1.html` | Yes | Yes | Homework 1 built HTML |
| `outputs/docx/CP4807-1.html` | Yes | Yes | Worksheet 1 built (HTML stand-in for DOCX) |

### Built outputs — missing (pending full run)

The following files are expected from the full block inventory but have not yet been built. This is expected for a prototype partial run.

DOCX targets pending (13): CP4807-Cont, CP4807-prep, CP4807-2 through CP4807-12, CP4807-CPDcert

HTML targets pending (12): CP4807-H2 through CP4807-H9, CP4807-A1 through CP4807-A3, CP4807-P1

---

## Duplicate Filename Check

| Filename | Occurrences | Resolution |
|---|---|---|
| `CP4807-1.doc` | 2 | W2 open — preparation block deferred. Rename required in source before full run. |

All other filenames across the 32 blocks are unique.

---

## Broken Reference Check

**outputs/html/CP4807-H1.html:** No broken internal references. Self-contained. Pass.

**outputs/docx/CP4807-1.html:** Contains one external link to YouTube sourced directly from the Word document. External URL validity is out of scope for this pipeline. Pass (internal references only).

---

## Unresolved Blocks

| Block | Issue | Action required |
|---|---|---|
| Block 3 — CP4807-1.doc (preparation notes) | Duplicate filename W2 | Rename to CP4807-prep.doc in source |
| Block 32 — CP4807-CPDcert | Missing file extension W3 | Add .docx to filename tag in source |

---

## Teacher Content Separation

The following blocks were correctly deferred and are not present in learner output folders:

- CP4807-TN.htm — Teacher's notes
- CP4807-marking scheme.htm — Marking scheme
- CP4807-SOW.htm — Scheme of work

No teacher-only content found in outputs/html/ or outputs/docx/. Pass.

---

## SCORM Packaging Assessment

| Requirement | Status |
|---|---|
| Manifest data in source | Not found |
| Launch file defined | Not defined |
| SCORM version | Not specified |
| Completion model | Not specified |
| Resource list | Not defined |
| All content files built | 2 of 28 present |

SCORM packaging cannot proceed. Content is substantive and well-structured, but explicit SCORM decisions must be added to the source document before packaging is viable.

See reports/packaging-report.md for the full gap analysis.

---

## Recommended Next Step

1. Resolve W2 and W3 in source.
2. Run full extraction and build.
3. Re-run validation to confirm all 28 outputs present.
4. If SCORM decisions documented in source, proceed to packaging.
