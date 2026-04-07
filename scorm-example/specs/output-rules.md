```markdown
# Output Rules

## Purpose

These rules define how extracted source blocks are converted into output files.

## General rules

1. Preserve the original wording unless formatting cleanup is needed.
2. Keep titles, headings, worksheet numbers, and visible labels intact.
3. Preserve the original order of sections within each block.
4. Do not rewrite content unless explicitly instructed.
5. Where formatting is unclear, prefer simple and clean structure.
6. Report unresolved formatting issues rather than inventing content.

## DOCX outputs

Applies to:
- `<worksheet>`
- `<document>`

Rules:
- create one DOCX file per valid source block
- use the exact filename where provided
- preserve visible title hierarchy
- preserve teacher and learner distinctions
- remove raw wrapper tags from the final output
- do not include unrelated planning notes unless the block itself is planning content

## HTML outputs

Applies to:
- `<HTML>`

Rules:
- create one HTML file per valid source block
- use semantic structure where possible
- include a `<title>` matching the content title if known
- preserve headings, lists, and paragraphs
- convert plain text layouts into simple readable HTML
- do not expose internal parsing notes in learner-facing output

## PDF outputs

Rules:
- only assemble PDFs when the source explicitly defines a combined PDF output
- maintain source document order
- confirm that every referenced source file exists before assembly
- if any referenced file is missing, stop assembly and report the issue

## Browser course outputs

Rules:
- generate a folder structure suitable for browser delivery
- create an index or launch page
- convert each screen definition into a page, link, embed, or document launch item
- preserve course sequence exactly as defined unless instructed otherwise
- report missing assets, broken links, or unsupported file types

## Naming rules

1. Use exact filenames where available.
2. If no filename is available, generate a safe placeholder and report it.
3. Do not overwrite duplicate filenames without reporting.
4. Maintain a generated output manifest listing:
   - source block
   - output filename
   - output type
   - status

## Validation rules

Every output build must include checks for:
- file existence
- filename uniqueness
- broken references
- unsupported file references
- duplicate screen definitions
- missing dependencies
```