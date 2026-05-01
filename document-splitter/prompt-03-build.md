Read `agents.md`, the files in `specs/`, and the completed reports:
- `reports/analysis-report.md`
- `reports/extraction-report.md`

Use the extracted content and build only the outputs that can be created safely from the available information.

## Tasks

1. Review the analysis and extraction reports before building anything.
2. Build learner-facing outputs from valid extracted blocks only.
3. Create or update outputs in:
   - `outputs/docx/`
   - `outputs/html/`
   - `outputs/browser-course/`
4. Preserve original content wording unless minor formatting cleanup is needed.
5. Remove raw wrapper tags like `<HTML>`, `<worksheet>`, `<document>`, and `<filename>` from final learner-facing outputs.
6. Keep titles, headings, worksheet numbers, and visible labels intact.
7. If a browser-course structure is explicitly defined in the source, assemble a simple folder structure and navigation based only on what is clearly specified.
8. Do not attempt final SCORM packaging in this stage.
9. Do not invent missing files, assets, metadata, or navigation rules.
10. If something is missing or ambiguous, skip it and report it.

## Validation required during build

Check for:
- missing referenced files
- broken internal references
- duplicate output names
- unsupported asset references
- blocks that should not be published because they are planning/specification text

## Deliverables

Update or create:
- learner-facing DOCX outputs in `outputs/docx/`
- learner-facing HTML outputs in `outputs/html/`
- browser course assets in `outputs/browser-course/` if clearly supported
- `reports/build-report.md`
- `reports/validation-report.md`

## Build report must include

### Summary
What was built and what was skipped.

### Outputs built
A table containing:
- source block
- output filename
- output type
- status
- notes

### Skipped items
Anything not built because of ambiguity, missing files, or invalid tags.

### Warnings
Formatting issues, unresolved references, duplicate names, missing filenames, unsupported assets.

### Errors
Anything that prevented a required build step.

## Validation report must include

- files checked
- missing files
- broken references
- duplicate filenames
- unsupported references
- planning/specification blocks excluded from learner output
- recommended next step

## Important rules

- Do not rewrite the educational content unless explicitly asked.
- Do not create placeholder learner content.
- Do not package SCORM in this stage.
- Prefer reporting uncertainty over guessing.