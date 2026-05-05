# Document Splitter

A browser-based tool that takes a tagged Word `.docx` and turns it into multiple structured outputs — learner HTML pages, worksheet DOCX files, and a SCORM bundle — all client-side, no server required.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Main upload tool — drop in a DOCX and optional media ZIP, inspect blocks, generate and download outputs |
| `how-to-guide.html` | Step-by-step authoring guide — tagging rules, bundle structure diagram, common errors |

---

## How it works

### 1 — Author a tagged source document

Write course content in Word, then wrap each deliverable block with tags so the tool knows what to build:

```
<HTML>
<filename>"CP4807-H1.html"</filename>

Homework 1 — Design a program that controls two sets of traffic lights.
</HTML>
```

**Block types:**

| Tag | Builds |
|---|---|
| `<HTML>` | Learner-facing HTML page |
| `<worksheet>` | Worksheet DOCX |
| `<document>` | Reference DOCX |

**Filename rules:**
- Must be wrapped in double quotes inside `<filename>` tags
- Must include a file extension
- Must be unique across the whole document
- Extension should match the block type (e.g. `<HTML>` → `.html`)
- Closing tag casing must match opening — `<HTML>` closes with `</HTML>`, not `</html>`

**Common errors that cause blocks to be skipped:**
- Duplicate filename — the second block is flagged
- Missing file extension — the tool cannot route the output
- Mismatched tag casing

### 2 — Upload to the tool

1. Drop the `.docx` onto the upload panel
2. Optionally drop a media `.zip` if your document references external images/videos by filename
3. Review the detected blocks, media matches, and any warnings
4. Click **Generate** to build all outputs, then **Bundle** to download a ZIP

### 3 — What you get

The downloaded bundle contains:

```
bundle.zip
  source/
    YourDoc.docx          — original source DOCX
    Media.zip             — original media ZIP (if uploaded)
  outputs/
    html/                 — one HTML file per <HTML> block
    docx/                 — one DOCX file per <worksheet> or <document> block
  scorm/
    imsmanifest.xml       — SCORM manifest (only when SCORM decisions are defined)
    ...
```

---

## Media handling

Two sources are checked in order:

1. **Embedded images** — automatically extracted from `word/media/` inside the DOCX. An `<image>image1.png</image>` tag matches these automatically.
2. **External media ZIP** — drop a `.zip` via the media panel. Tags like `<image>photo.jpg</image>` match by filename against the ZIP contents.

Media filenames are sanitised before embedding — spaces and URI-illegal characters are replaced with underscores. Mismatched or ambiguous filenames produce a warning.

---

## SCORM packaging

A SCORM manifest is only generated when all five decisions are explicitly defined in the source document:

| # | Decision | Example |
|---|---|---|
| 1 | SCORM version | `scorm-version: "1.2"` |
| 2 | Launch file | `launch: "CP4807-H1.html"` |
| 3 | Tracking model | `tracking: "completion-only"` |
| 4 | Completion model | `completion: "page-view"` |
| 5 | Navigation rules | `navigation: "free"` |

If any are missing the tool reports exactly what is absent and does not produce a partial manifest.

---

## Example source document

`source/CP4807 - Introduction to microcontrollers 05 04 26.docx`

A real tagged DOCX with **32 blocks**, using external media references. The companion media archive is `source/Media.zip`. Both files are included in the tool page as downloadable examples.

---

## Regression test

After any change to block extraction, media handling, or DOCX building:

```
node document-splitter/build-all.js
```

Must report: **32 blocks, 66 checks, 0 failures**

---

## Project layout

```
index.html              — upload tool
how-to-guide.html       — authoring guide
upload-media.js         — all browser logic
build-all.js            — Node.js regression test
inspect-filename.js     — debug tool for <filename> tag parsing issues
source/                 — example DOCX and Media.zip
outputs/                — built files (docx/, html/, extracted/)
specs/                  — tag-rules.md, output-rules.md, scorm-rules.md, media-rules.md, source-authoring-guide.md
agents.md               — AI agent pipeline roles and stop conditions
prompt-01-analyse.md    — Stage 1 prompt (analyse)
prompt-02-extract.md    — Stage 2 prompt (extract)
prompt-03-build.md      — Stage 3 prompt (build)
prompt-04-package-scorm.md — Stage 4 prompt (package)
reports/                — outputs from AI pipeline runs
```

---

## License

See repository license file.
