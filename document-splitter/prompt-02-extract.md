Read:
- `agents.md`
- `specs/tag-rules.md`
- `specs/output-rules.md`
- `specs/scorm-rules.md`
- `reports/analysis-report.md`

Use the source file:
- `source/CP4807 - Introduction to microcontrollers 05 04 26.docx`

Using the completed analysis report, perform extraction of all valid tagged content blocks.

## Tasks

1. Extract each valid tagged block into the appropriate output staging area.
2. Save intermediate extracted text or structured content into:
   - `outputs/extracted/`
3. Create DOCX targets for valid `<worksheet>` and `<document>` blocks.
4. Create HTML targets for valid `<HTML>` blocks.
5. Preserve content order, headings, visible titles, and filenames.
6. Exclude planning-only, instruction-only, or unresolved blocks from learner-facing outputs unless explicitly told otherwise.
7. Do not attempt final SCORM packaging yet.
8. Produce:
   - `reports/extraction-report.md`

## Rules

- Use exact filenames where provided.
- If a filename is missing, duplicated, or ambiguous, do not guess silently.
- Log all warnings and errors.
- Preserve source order.
- Do not rewrite source content.
- Do not invent missing content or metadata.
- Remove nothing from the source file itself.
- If a block cannot be safely extracted, skip it and report why.

## Extraction report must include

- Summary
- Files created
- Files skipped
- Warnings
- Errors
- Recommended next step