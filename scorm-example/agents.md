# AI Agent Instructions

## Purpose

This project uses one master DOCX file as the source for multiple generated outputs.

The source file contains:
- learner content
- teacher content
- homework and assessment content
- custom tags
- planning notes
- AI/build instructions

This source file is not automatically a finished SCORM package.

## Main source file

`source/CP4807 - Introduction to microcontrollers 05 04 26.docx`

## What you must do

Work in stages.

1. Analyse the source
2. Extract tagged blocks
3. Generate output files
4. Assemble browser and SCORM outputs where possible
5. Validate everything
6. Report all warnings and errors

## What you must not do

- Do not assume the source document is SCORM compliant
- Do not invent missing filenames silently
- Do not invent SCORM settings unless explicitly told
- Do not publish planning notes as learner content
- Do not rewrite content unless asked
- Do not hide ambiguity

## Tag rules

### `<HTML> ... </HTML>`
Create an HTML file from this block.

### `<worksheet> ... </worksheet>`
Create a DOCX file from this block.

### `<document> ... </document>`
Create a DOCX file from this block.

### `<filename> "name.ext" </filename>`
Use this exact filename for the current block.

## Interpretation rules

- A filename belongs to the nearest relevant block
- Preserve source order
- If tags are malformed, report them
- If a filename is missing, report it
- If duplicate filenames exist, report them
- If content is clearly instruction text, classify it as planning/specification, not learner content

## Required classifications

Classify each block as one of:
- learner content
- teacher content
- homework
- assessment
- certificate
- project brief
- planning/specification
- unresolved

## Working stages

### Stage 1: Analyse
Produce:
- list of all tagged blocks
- filenames
- output types
- warnings
- SCORM-related observations

Save report to:
`reports/analysis-report.md`

### Stage 2: Extract
Extract valid blocks into:
`outputs/extracted/`

Also create target files in:
- `outputs/docx/`
- `outputs/html/`

Save report to:
`reports/extraction-report.md`

### Stage 3: Build
Build:
- learner-facing HTML files
- DOCX outputs
- browser course structure if defined

Save report to:
`reports/build-report.md`

### Stage 4: SCORM
Only proceed if enough explicit information exists.

Minimum expectations:
- valid manifest
- launchable content
- valid resource references
- enough information to package safely

If not enough information exists:
- stop SCORM packaging
- report exactly what is missing

Save report to:
`reports/packaging-report.md`

### Stage 5: Validate
Check:
- missing files
- broken references
- duplicate filenames
- unresolved blocks
- SCORM packaging problems

Save report to:
`reports/validation-report.md`

## SCORM rules

Treat SCORM carefully.

The source document may contain SCORM notes, but these may only be:
- placeholder notes
- partial specification
- planning text

Do not treat SCORM notes as a complete implementation unless a real package can be built.

Do not invent:
- SCORM version
- sequencing
- completion logic
- tracking behaviour
- launch structure

unless explicitly instructed.

## Output expectations

Use exact filenames where given.

Possible outputs:
- DOCX files
- HTML files
- browser course assets
- SCORM package skeleton
- validation reports

## First task

Your first task is analysis only.

Read the source file and produce:
- all tagged blocks
- filenames
- intended outputs
- warnings/errors
- SCORM readiness notes

Do not generate final outputs in the first pass.