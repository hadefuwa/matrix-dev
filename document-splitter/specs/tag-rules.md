# Tag Rules

These rules define how the source Word document must be tagged so the pipeline can analyse, extract, build, and package outputs safely.

## 1. Use recognised block tags only

Use one of these publishable block types:

- `<HTML> ... </HTML>` for learner-facing web pages
- `<worksheet> ... </worksheet>` for printable or downloadable worksheet outputs
- `<document> ... </document>` for supporting documents or reference files

Any other tag should be treated as unrecognised and the block should be skipped with a warning.

## 2. One output block = one real deliverable

Each tagged block should contain exactly one publishable item.

- Do not combine multiple assignments in one block.
- Do not mix learner content and planning text in the same block.
- Do not nest publishable blocks inside each other.

If a block contains instructions to the production team rather than learner-facing content, classify it as specification text instead of publishing it.

## 3. Every publishable block must contain a filename

Use:

`<filename>"name.ext"</filename>`

Rules:

- The filename is required for every publishable block.
- The filename must be wrapped in double quotes.
- The filename must be unique across the entire source document.
- The filename must include a file extension.
- The extension should match the output type.

Examples:

- `<HTML>` -> `CP4807-H1.html`
- `<worksheet>` -> `CP4807-1.docx`
- `<document>` -> `CP4807-CPDcert.pdf`

## 4. Opening and closing tags must match exactly

The closing tag must match the opening tag exactly, including case.

Correct:

`<HTML> ... </HTML>`

Incorrect:

`<HTML> ... </html>`

## 5. Optional display title can appear after the opening tag

The first visible line inside a block may be used as the display title for the built output.

If a title is omitted, the filename stem may be used instead.

## 6. Content outside recognised tags is not automatically published

Text outside recognised tags should be treated as reference, planning, or specification material unless explicitly instructed otherwise.

This includes:

- author notes
- build instructions
- SCORM planning notes
- internal review comments

## 7. Best practice for SCORM-ready authoring

If the final goal is a strong SCORM-compliant resource pack, the source should also follow these authoring rules:

- Put launchable learner pages in `<HTML>` blocks.
- Keep each assessment or trackable learner activity in its own HTML block.
- Keep worksheets and supporting files separate from SCO-style learner pages.
- Use stable, human-readable titles so manifest labels and LMS navigation are clear.
- Avoid teacher-only text inside learner-facing blocks.
- Make sure the intended SCORM launch file is a real generated HTML output.

## 8. SCORM package decisions must be explicit

Tagged content alone does not make the source SCORM-ready.

The source document or a companion SCORM definitions file must explicitly state:

- SCORM version
- launch file
- tracking model
- completion model
- navigation rules

If these decisions are missing, SCORM packaging must stop and report the gap rather than guessing.

## 9. External resource links must be written explicitly

The source may include external resources such as:

- YouTube videos
- Google Docs
- Google Slides
- datasheets
- vendor reference pages

Authoring rules:

- Put learner-visible links inside the publishable block where learners need them.
- Write a human-readable label in the source text before or beside the URL.
- Use stable share or view links, not temporary editing-session URLs.
- Prefer direct resource links over search-result pages.

Recommended examples:

- `Video resource: https://youtu.be/example`
- `Datasheet: PIC16F877A datasheet - https://vendor.example/file.pdf`
- `Learner slides: https://docs.google.com/presentation/d/.../view`

## 10. Teacher-only links must be separated from learner content

Teacher-only items such as:

- answer sheets
- editable Google Docs
- editable Google Slides
- delivery notes
- internal planning links

should not be mixed into learner-facing HTML blocks unless learners are meant to see them.

Place them in:

- a separate `<document>` block
- a dedicated teacher resource page
- companion specification material outside learner content
