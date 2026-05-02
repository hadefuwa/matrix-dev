# Document Splitter — CLAUDE.md

## What this is

A browser-based tool that takes a tagged Word `.docx` file and turns it into multiple structured outputs (learner HTML pages, worksheet files) plus a SCORM bundle — all client-side, no server.

The tool lives at `document-splitter/` and is one page: `index.html` + `upload-media.js`.

There is also an AI pipeline alongside it (prompts, specs, agents) for running the same process through Claude agents rather than the browser. Both pipelines follow the same tagging rules.

---

## File layout

```
index.html              — single-page UI (hero + upload panels)
upload-media.js         — all logic: DOCX parsing, block detection, output generation
styles.css              — legacy styles (not used by index.html, which is self-contained)
.gitignore              — excludes ~$* Word temp files

source/
  CP4807 - Introduction to microcontrollers 05 04 26.docx  — example source document
  Media.zip             — companion media ZIP for the example (external-image workflow)
  Media/                — individual media files from the ZIP

specs/
  tag-rules.md          — block recognition and filename binding rules
  output-rules.md       — output naming and routing
  scorm-rules.md        — SCORM packaging requirements and stop conditions
  source-authoring-guide.md — how to write a source DOCX correctly
  media-rules.md        — media handling invariants, URI-safety rule, cover-table pattern, regression test

agents.md               — AI agent roles, stage definitions, stop conditions
prompt-01-analyse.md    — Stage 1 prompt
prompt-02-extract.md    — Stage 2 prompt
prompt-03-build.md      — Stage 3 prompt
prompt-04-package-scorm.md — Stage 4 prompt

reports/                — outputs from AI pipeline runs
outputs/                — built files from AI pipeline runs
```

---

## Browser tool architecture (`upload-media.js`)

All logic is in one plain JS file — no bundler, no framework. JSZip is loaded from CDN for DOCX and ZIP parsing.

### State variables

```js
currentSourceFile       // DOCX filename
currentSourceText       // extracted plain text from DOCX
currentAnalysis         // { blocks, warnings, scorm, media }
currentMediaZipName     // name of uploaded external media ZIP
currentMediaBundle      // files from external ZIP
currentMediaIndex       // Map: normalised filename → file object
currentMediaDuplicateNames // Set of ambiguous names in ZIP
currentEmbeddedMedia    // files extracted from word/media/ in the DOCX
currentEmbeddedMediaIndex  // Map: normalised filename → file object
generatedArtefacts      // built output files ready for download
activeObjectUrls        // blob URLs to revoke on reset
```

### Flow

1. User drops a `.docx` → `handleSourceFile` → JSZip reads it
2. `extractEmbeddedMediaFromDocx` pulls all images out of `word/media/` inside the DOCX
3. `extractReadableTextFromDocx` gets plain text from `word/document.xml`
4. `analyzeText` finds tagged blocks (`<HTML>`, `<worksheet>`, `<document>`) and `<filename>` values
5. `applyMediaStateToAnalysis` matches `<image>`, `<video>` etc. refs against embedded media first, then external ZIP
6. `renderAnalysis` updates all panels
7. User optionally drops a media `.zip` → `handleMediaFile` re-runs media matching and rebuilds outputs
8. Generate / Bundle buttons call `buildPrototypeArtefacts` → `downloadBundle`

### Panel IDs (must match HTML exactly)

`fileInput`, `mediaInput`, `dropzone`, `mediaDropzone`, `fileMeta`, `mediaMeta`, `previewBox`, `previewStatus`, `blocksList`, `blocksCount`, `outputsList`, `outputsCount`, `scormPanel`, `scormStatus`, `mediaList`, `mediaCount`, `warningsList`, `warningsCount`, `actionsPanel`, `actionStatus`, `generateBtn`, `summaryBtn`, `bundleBtn`, `generatedPanel`, `generatedCount`, `generatedList`

---

## Tagging rules (source document)

Three block types are recognised:

| Tag | Output type |
|-----|------------|
| `<HTML> ... </HTML>` | Learner-facing HTML page |
| `<worksheet> ... </worksheet>` | Worksheet / printable |
| `<document> ... </document>` | Reference or supporting doc |

Every block must contain:
```
<filename>"CP4807-H1.html"</filename>
```
- Double quotes required
- Unique across the whole document
- Must include a file extension
- Case-sensitive: `<HTML>` must close with `</HTML>`, not `</html>`

Media references inside a block:
```
<image>photo.jpg</image>
<video>intro.mp4</video>
<audio>narration.mp3</audio>
<datasheet>spec.pdf</datasheet>
```

Text outside recognised tags is treated as planning/spec material and is not published.

---

## Media handling

Two sources are checked in order:

1. **Embedded images** — automatically extracted from `word/media/` when the DOCX loads. Word assigns internal names like `image1.png`. An `<image>image1.png</image>` tag will match automatically. No ZIP needed.

2. **External media ZIP** — for documents that reference files by name but store them outside the DOCX. User uploads a `.zip` via the media dropzone. `<image>photo.jpg</image>` matches against the ZIP by filename.

If neither source has a match, a warning is raised. The "No media available" warning is only shown when both embedded images and the ZIP are absent.

---

## SCORM packaging

SCORM packaging is generated in the bundle download. It will not produce a manifest unless:
- At least one HTML block with a filename exists
- The source contains SCORM-related notes (version, launch file, completion, tracking, navigation)

Never invent SCORM settings. If decisions are missing, the tool reports what is absent.

---

## UI design system (`index.html` is self-contained)

CSS custom properties defined in `:root`:

```
--ink, --ink-2, --muted, --muted-light
--panel, --surface, --line
--accent, --accent-mid, --accent-soft, --accent-xsoft
--teal, --teal-soft
--success, --success-soft
--warn, --warn-soft
--danger, --danger-soft
--purple, --purple-soft
--shadow-sm, --shadow, --shadow-lg
--radius (20px), --radius-sm (14px)
```

Hero section: dark navy gradient (`#0f2358` → `#1d4ed8` → `#3b82f6`), white dot grid overlay, three animated orbs (`orb-drift` keyframe). Hero copy text sits directly on the gradient (white text). Only the pipeline card (`.hero-pipeline-card`) is a white floating card.

JS-generated card classes in the DOM: `.block-card`, `.output-card`, `.media-card`, `.warning-card`, `.generated-card`, `.scorm-card`. CSS aliases: `.card-top` = `.block-top` = `.output-top`; `.tag-row` = `.block-meta` = `.output-meta`.

---

## Example source document

`source/CP4807 - Introduction to microcontrollers 05 04 26.docx`

This is a real tagged DOCX with 32 blocks. It uses **external media references** (files are in `source/Media/` and `source/Media.zip`). It is the downloadable example on the tool page.

---

## What NOT to do

- Do not invent filenames or SCORM settings
- Do not rewrite source content unless asked
- Do not add `<script>` tags after `upload-media.js` to override its functions — they are module-scoped and cannot be overridden externally
- Do not add IDs to HTML elements that `upload-media.js` does not reference — they will silently do nothing
- Do not break the panel ID list — the JS selects all panels by ID at startup
- **Do not write media filenames directly into ZIP entries or `Target` attributes without calling `sanitizeMediaFilename()` first** — spaces and other URI-illegal characters cause Word to silently drop the image with no error (see `specs/media-rules.md` §3)
- **Do not exclude the opening paragraph of a block from content when it is a table** — the cover-table pattern means the opening table holds real deliverable content, including the cover image (see `specs/media-rules.md` §4)
- **Do not modify media-handling code without running `node document-splitter/build-all.js` afterwards** — it must report 32 blocks, 66 checks, 0 failures

---

## Regression testing

After any change to media handling, block extraction, or DOCX building:

```
node document-splitter/build-all.js
```

This replicates the full browser pipeline in Node.js and verifies every block's embedded images. It is the authoritative regression guard for the two historical bugs:

| Bug | Guard |
|-----|-------|
| Spaces in filenames → blank images in Word | CP4807-6 must embed `electronics_board.jpg` and `youtube_logo.png` |
| Cover-table image dropped | Every worksheet block must contain at least one embedded image |

Both bugs were confirmed and fixed May 2026. Details in `specs/media-rules.md`.
