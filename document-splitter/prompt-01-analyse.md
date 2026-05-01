You are working in a course-build project.

The main source file is a tagged DOCX authoring document located at:
`source/CP4807 - Introduction to microcontrollers 05 04 26.docx`

It is a source document for generating multiple outputs. It is not assumed to be a finished SCORM package.

Read these project rules first:
- `agents.md`
- `specs/tag-rules.md`
- `specs/output-rules.md`
- `specs/scorm-rules.md`
- `README.md`

Your task in this first pass is analysis only.

Objectives:
1. Read the source document and identify all recognised tagged blocks.
2. For each block, determine:
   - tag type
   - filename
   - likely output format
   - brief content description
   - whether it looks like learner content, teacher content, homework, assessment, planning, or other
3. Detect any malformed, duplicated, incomplete, or ambiguous tag usage.
4. Detect any content that should not be published directly because it is instruction text or planning text.
5. Identify all SCORM-related sections and classify whether they are:
   - finished implementation content
   - partial specification
   - placeholder notes
6. Produce a report at:
   `reports/analysis-report.md`

Rules:
- Do not generate final outputs yet.
- Do not rewrite source content.
- Do not invent missing filenames or metadata without flagging them.
- Preserve source order.
- Report uncertainty clearly.

Expected report sections:
- Summary
- Tagged blocks table
- Filename list
- Warnings
- Errors
- SCORM readiness observations
- Recommended next step