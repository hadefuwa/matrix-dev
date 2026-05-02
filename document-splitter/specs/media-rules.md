# Media Rules

These rules govern how media files (images, video, audio, datasheets) are handled when building output DOCX and HTML files from a tagged source document.

---

## 1. Two media sources are checked in order

1. **Embedded images** — extracted from `word/media/` inside the source DOCX at load time. Stored in `currentEmbeddedMedia` / `currentEmbeddedMediaIndex`.
2. **External media ZIP** — a companion `.zip` uploaded by the user. Stored in `currentMediaBundle` / `currentMediaIndex`.

Embedded images are checked first. If a match is found there, the ZIP is not consulted for that file. If neither source has a match, a warning is raised.

---

## 2. `r:link` → `r:embed` conversion (pre-patch)

Word documents that reference images via OneDrive or local `file:///` URLs store them as `r:link` attributes in `word/document.xml` and as External relationships in `word/_rels/document.xml.rels`.

At media-load time, `patchSourceXmlForEmbeddedImages` rewrites every `r:link` to `r:embed` in the in-memory XML and marks the corresponding relationship entry with `_resolvedFile` pointing to the actual file data from the ZIP or embedded media.

**This must happen before any block is built.** Blocks read the patched XML. If the pre-patch has not run, `r:link` relationships will be written into output files as External references, which Word cannot follow on another machine.

---

## 3. Media filenames MUST be URI-safe (critical)

OOXML relationship `Target` attributes are **anyURI** values. Word treats them as URI paths when resolving images from `word/media/`. Characters that are illegal in a URI path cause Word to silently fail to load the image — no error is shown, the image slot is simply blank.

**Illegal characters in filenames:**

| Character | Reason |
|-----------|--------|
| Space ` ` | Must be `%20` in a URI, but Word does not decode it from a ZIP entry name |
| `#` | Fragment delimiter |
| `%` | Percent-encoding prefix |
| `&` | Query string separator |
| `?` | Query string start |

**Rule: always call `sanitizeMediaFilename(name)` before writing any filename to a ZIP entry or a `Target` attribute.**

```js
function sanitizeMediaFilename(name) {
  return String(name).replace(/[\s#%&?]/g, "_");
}
```

Apply this in every code path that writes a media file to an output ZIP:
- `buildBlockRels` — Internal + `_resolvedFile` path
- `buildBlockRels` — External → ZIP fallback path
- `resolveImageNodes` — injected drawing nodes

**The historical failure:** `electronics board.jpg` and `youtube logo.png` always produced blank image slots in Word. `Macros.jpg` (no spaces) always worked. Root cause confirmed May 2026.

---

## 4. Cover-table pattern

Every `<worksheet>` block in CP4807-style documents begins with a Word **table** that contains:
- the `<worksheet>` opening tag text
- the cover image (an `<wp:inline>` drawing referencing the first `r:embed`)

The block-scanner correctly identifies this table row as the "opening tag paragraph" (`openParaIndex`). However, `extractContentParaNodes` must **include** this table in the output content — it contains real deliverable content (the cover image), not just a tag marker.

**Rule:** when `paragraphs[openParaIndex].isTable === true`, include that node as the first content node.

```js
function extractContentParaNodes(rawBlock, paragraphs) {
  const open  = rawBlock.openParaIndex ?? 0;
  const close = rawBlock.closeParaIndex ?? paragraphs.length - 1;
  const nodes = [];
  const openEntry = paragraphs[open];
  if (openEntry && openEntry.isTable) nodes.push(openEntry.xmlNode);
  for (let i = open + 1; i < close; i++) {
    if (paragraphs[i]) nodes.push(paragraphs[i].xmlNode);
  }
  return nodes;
}
```

**The historical failure:** the cover image was always missing from all worksheet DOCX outputs. Root cause confirmed May 2026.

---

## 5. Relationship Target encoding

When writing `<Relationship>` entries into `word/_rels/document.xml.rels`:

- Use `escapeXml()` on the `Target` value (handles `<`, `>`, `&`, `"`, `'`).
- The sanitized filename (rule 3) must be applied **before** `escapeXml()`, not after.
- The `Target` value must be a relative path: `media/filename.ext` — never an absolute path or URL.
- The `Type` attribute for images must be `http://schemas.openxmlformats.org/officeDocument/2006/relationships/image`.

---

## 6. Regression test

`document-splitter/build-all.js` is a Node.js pipeline that replicates the full browser build without any browser APIs. Run it after any change to media-handling code:

```
node document-splitter/build-all.js
```

Expected output: **32 blocks built, 66 image checks, 0 failures.**

Specific checks that guard against the two historical bugs:
- CP4807-6 must contain `electronics_board.jpg` (was failing due to space in filename)
- CP4807-6 must contain `youtube_logo.png` (was failing due to space in filename)
- CP4807-6 must contain `Macros.jpg` (baseline — always worked)
- Every worksheet block (CP4807-0 through CP4807-12) must contain at least one embedded image (cover-table guard)

If `build-all.js` passes, the browser tool (`upload-media.js`) is safe to ship — both share the same logic.
