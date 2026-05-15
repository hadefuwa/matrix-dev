# Plan: Multi-package SCORM support in the document splitter

**Status:** Draft proposal — not yet approved for implementation.
**Author:** Hamed (with Claude)
**Last updated:** 2026-05-15
**Effort estimate:** 1.5–2 developer-days, plus 0.5 day for spec/doc updates and test data.

---

## TL;DR

The splitter currently produces **one combined SCORM manifest per source document**, regardless of what SCORM notes the author writes. It does keyword-detection only and ignores the actual values (`launch:`, `tracking:`, etc.). Source documents that define multiple courses (e.g. CO0002, CO0003, CO0004 in the same file) collapse into one undeployable bundle.

This plan proposes adding a real `<scorm>...</scorm>` block type that:

1. Is parsed by the existing tokenizer with a small extension.
2. Holds the five SCORM decisions as inner fields (version, launch, tracking, completion, navigation) plus an `id`.
3. **Scopes** subsequent `<HTML>`/`<worksheet>`/`<document>` blocks to its package by document order.
4. Causes the bundle to emit one self-contained, LMS-uploadable `.zip` per scope under `scorm-packages/`, in addition to the existing combined `generated/` folder.
5. Is fully backwards compatible: documents without any `<scorm>` block continue to behave exactly as today.

The work is contained to `upload-media.js`, `build-all.js`, three spec files, and `how-to-guide.html`. No framework or dependency changes.

---

## 1. Background — what happens today

### Current parser

[`upload-media.js:502`](upload-media.js#L502) defines the only token pattern the splitter recognises:

```js
const tokenPattern = /<filename>\s*\"?([^\"<>\n]+)\"?\s*<\/filename>|<(HTML|worksheet|document)>|<\/(HTML|worksheet|document)>/gi;
```

Three block types and one inner field. Anything else is invisible text.

### Current SCORM analyser

[`upload-media.js:725`](upload-media.js#L725) (`analyzeScorm`) does **keyword detection only**:

| What the guide tells the author to write | What the parser actually does with it |
|---|---|
| `scorm-version: "1.2"` | Checks if text contains `"scorm 1.2"` or `"scorm 2004"` — picks a label. Value not bound to any output. |
| `launch: "CO0002-Welcome.htm"` | Checks if text contains the word `"launch"` / `"index.html"` / `"start"` — does **not** read the filename. |
| `tracking: "completion-only"` | Keyword check (`tracking`/`suspend_data`/`bookmark`/`progress`) — label only. |
| `completion: "page-view"` | Keyword check (`completion`/`passed`/`mastery`/`score`) — label only. |
| `navigation: "free"` | Keyword check (`sequencing`/`navigation`/`next`/`previous`) — label only. |

The values are reported in `scorm-readiness.txt` but **never reach the manifest builder**.

### Current manifest builder

[`upload-media.js:1572`](upload-media.js#L1572) (`buildBasicManifest`) takes **all** generated artefacts:

```js
const htmlArtefacts = artefacts.filter((file) => /\.html?$/i.test(file.filename));
// → every HTML becomes a SCO
// → every DOCX becomes an asset
// → ONE <organization>, ONE <imsmanifest.xml>
```

The package title comes from `currentSourceFile`. There is exactly one manifest per upload run.

### Why this matters for the boss's source docs

`source/Microcontroller based courses 07 05 26.docx` defines three courses (CO0002 / CO0003 / CO0004) and three `SCORM definition` blocks. Run through the splitter today:

- All HTML across all three courses collapse into one manifest.
- The three SCORM definition blocks are ignored except for keyword detection.
- No deployable per-course SCORM packages are produced.

This is the gap the plan closes.

---

## 2. Goal

After this change ships, an author can write:

```text
<scorm>
<id>CO0002</id>
<scorm-version>"1.2"</scorm-version>
<launch>"CO0002-Welcome.htm"</launch>
<tracking>"completion-only"</tracking>
<completion>"page-view"</completion>
<navigation>"free"</navigation>
</scorm>

<HTML>
<filename>"CO0002-Welcome.htm"</filename>
…
</HTML>

<HTML>
<filename>"CO0002-LO.htm"</filename>
…
</HTML>

<scorm>
<id>CO0003</id>
<scorm-version>"1.2"</scorm-version>
<launch>"CO0003-Welcome.htm"</launch>
<tracking>"completion-only"</tracking>
<completion>"page-view"</completion>
<navigation>"free"</navigation>
</scorm>

<HTML>
<filename>"CO0003-Welcome.htm"</filename>
…
</HTML>
```

…and the bundle download contains:

```
bundle.zip
├── source/                                    (unchanged)
├── generated/                                 (unchanged — all outputs in one place)
│   ├── CO0002-Welcome.htm
│   ├── CO0002-LO.htm
│   ├── CO0003-Welcome.htm
│   └── …
├── media/                                     (unchanged)
├── scorm-packages/                            ★ NEW
│   ├── CO0002.zip                             ★ self-contained, LMS-uploadable
│   │     └── (extracted) imsmanifest.xml + content/ + media/
│   └── CO0003.zip                             ★ self-contained, LMS-uploadable
├── imsmanifest.xml                            (kept for back-compat — see §6)
├── summary-report.txt                         (extended)
├── scorm-readiness.txt                        (extended — per-scope sections)
└── blocks-metadata.json                       (extended — adds scormScopeId)
```

---

## 3. Design decisions

### 3.1 Scoping model — sibling marker, not wrapper

**Chosen:** A `<scorm>` block is a **metadata-only sibling** that owns every following content block until the next `<scorm>` block (or EOF).

```
<scorm>…</scorm>          ← scope CO0002 begins here
<HTML>…</HTML>            ← belongs to CO0002
<HTML>…</HTML>            ← belongs to CO0002
<scorm>…</scorm>          ← scope CO0003 begins here; CO0002 ends
<HTML>…</HTML>            ← belongs to CO0003
```

**Alternative considered:** A `<scorm>` wrapper that physically encloses content blocks. Rejected because:

- The current parser is a flat token stream (no nesting state machine). Wrapper syntax would force a refactor to recursive parsing.
- Authors would have to indent/structure their Word docs more carefully — friction the boss has already pushed back on.
- Sibling markers make scope changes trivially visible in the warnings panel (`Block N belongs to scope X`).

**Edge case — content blocks before the first `<scorm>` block:** They get the implicit "default" scope. If the document has any `<scorm>` blocks at all, the default-scope blocks still produce outputs in `generated/` but **do not** appear in any `scorm-packages/*.zip`. A warning is raised: `"3 blocks appear before any <scorm> marker — they will not be included in any SCORM package."`

**Edge case — no `<scorm>` blocks at all:** Behave exactly as today. Build the single combined `imsmanifest.xml` at bundle root if `analyzeScorm` keyword-detects SCORM intent. No `scorm-packages/` folder.

### 3.2 Inner field syntax

`<scorm>` block fields use the same `<key>"value"</key>` style as `<filename>`:

| Field | Required? | Value format | Default if missing |
|---|---|---|---|
| `<id>` | yes | `"CO0002"` (slug — must be unique within the doc) | warning + skip the package |
| `<scorm-version>` | no | `"1.2"` or `"2004"` | `"1.2"` |
| `<launch>` | yes | `"CO0002-Welcome.htm"` (must match an HTML block in this scope) | warning + skip the package |
| `<tracking>` | no | `"completion-only"` / `"score-only"` / `"completion-and-score"` | `"completion-only"` |
| `<completion>` | no | `"page-view"` / `"quiz-pass"` / `"manual"` | `"page-view"` |
| `<navigation>` | no | `"free"` / `"linear"` | `"free"` |

**Quote handling:** Use the same lenient regex as `<filename>` — straight or smart quotes accepted, sanitised to a clean string.

**Two required fields (`id`, `launch`) is the minimum** to produce a deployable package. Defaults are deliberately CPD-friendly so authors can skip the other three for typical courses.

### 3.3 Why keep the legacy single-manifest path

If we remove the existing `imsmanifest.xml` at the bundle root, anyone currently using the tool with the keyword-only SCORM detection sees their workflow break silently. Keep it as a fallback for documents with **zero** `<scorm>` blocks. Document this clearly in the spec.

---

## 4. Implementation plan

### 4.1 Parser — `upload-media.js`

#### 4.1.1 Extend the token pattern

Replace [`upload-media.js:502`](upload-media.js#L502):

```js
// BEFORE
const tokenPattern = /<filename>\s*\"?([^\"<>\n]+)\"?\s*<\/filename>|<(HTML|worksheet|document)>|<\/(HTML|worksheet|document)>/gi;

// AFTER
const tokenPattern = new RegExp(
  [
    // Inner fields (filename, scorm field tags)
    '<(filename|id|scorm-version|launch|tracking|completion|navigation)>\\s*[\\u201C"]?([^"\\u201C\\u201D<>\\n]+)[\\u201D"]?\\s*<\\/\\1>',
    // Block opens
    '<(HTML|worksheet|document|scorm)>',
    // Block closes
    '<\\/(HTML|worksheet|document|scorm)>'
  ].join('|'),
  'gi'
);
```

The match groups become:

- `match[1]` — inner field name
- `match[2]` — inner field value (sanitised later)
- `match[3]` — opening block type
- `match[4]` — closing block type

Update the `while` loop in `analyzeText` ([`upload-media.js:508`](upload-media.js#L508)) to dispatch on whether the inner field is `filename` (existing behaviour) or one of the new SCORM field names (route into `currentBlock.scormFields[name] = value` if `currentBlock.tagType === 'scorm'`).

#### 4.1.2 New block-type handling

In the open-tag branch, treat `<scorm>` like other openers but with `tagType: 'scorm'` and a fresh `scormFields: {}`. Existing finalize/close logic works without change because `<scorm>` follows the same open/close grammar.

In `finalizeBlock` ([search for `finalizeBlock` in upload-media.js]), branch on `block.tagType === 'scorm'`:

- Do **not** add to `blocks[]` (SCORM blocks are not deliverable artefacts).
- Push to a new array `scormScopes[]` instead.
- Validate: missing `id` → push warning, skip scope. Duplicate `id` → push warning, skip second one.

#### 4.1.3 Scope assignment pass

After the main parse loop, run a second pass to bind content blocks to scopes:

```js
function assignScormScopes(blocks, scormScopes) {
  if (!scormScopes.length) return;                       // back-compat path
  // scopes are in document order; each owns blocks until the next scope's start position
  scormScopes.forEach((scope, i) => {
    const scopeStart = scope.rawOpenIndex;
    const scopeEnd = scormScopes[i + 1]?.rawOpenIndex ?? Infinity;
    scope.blockOrder = blocks
      .filter(b => b.rawOpenIndex > scopeStart && b.rawOpenIndex < scopeEnd)
      .map(b => b.order);
    scope.blockOrder.forEach(order => {
      const block = blocks.find(b => b.order === order);
      block.scormScopeId = scope.id;
    });
  });
  // Anything left without a scopeId belongs to the implicit default
  const orphans = blocks.filter(b => !b.scormScopeId);
  if (orphans.length) {
    // raise a warning at warn-level (not danger) — outputs still build
  }
}
```

#### 4.1.4 Per-scope launch validation

For each `scormScopes[i]`, verify `scope.launch` matches the `filename` of an HTML block in `scope.blockOrder`. If not, push a danger-level warning and mark the scope as `skip: true`. The bundle step then skips emitting that `scorm-packages/<id>.zip`.

### 4.2 Data model changes

`analyzeText` return value extends to:

```js
{
  blocks: [
    { order, tagType, filename, scormScopeId, … }     // scormScopeId NEW
  ],
  scormScopes: [                                       // NEW
    {
      id: "CO0002",
      version: "1.2",
      launch: "CO0002-Welcome.htm",
      tracking: "completion-only",
      completion: "page-view",
      navigation: "free",
      blockOrder: [3, 4, 5],
      warnings: [],
      skip: false,
      startLine: 12,
      rawOpenIndex: 480
    }
  ],
  scorm: { … }                                         // legacy summary kept for back-compat
}
```

### 4.3 SCORM analyser update

Replace `analyzeScorm` ([`upload-media.js:725`](upload-media.js#L725)) so that:

- If `scormScopes.length > 0` → return per-scope summaries (one entry per scope, with the actual parsed values, not keyword guesses).
- If `scormScopes.length === 0` → keep the existing keyword-detect path verbatim. Behaviour for legacy docs is unchanged.

Rename the result from `scorm` (singular) to keep `scorm` for the legacy summary and add `scormScopes` alongside it. Renderers below use `scormScopes` if non-empty, else `scorm`.

### 4.4 Manifest builder — refactor `buildBasicManifest`

Split into two functions:

```js
function buildLegacyCombinedManifest(analysis, artefacts) { … }   // current behaviour, unchanged
function buildScopedManifest(scope, scopeArtefacts, mediaEntries) { … }  // NEW
```

`buildScopedManifest` differs from the legacy builder in that it:

- Uses `scope.id` for `packageId` and `<organization>` title (instead of source filename).
- Sets `<schemaversion>` from `scope.version` (`"1.2"` or `"2004"`).
- Includes only `scopeArtefacts` (the artefacts whose blocks are in `scope.blockOrder`).
- Uses **package-relative paths** (`content/CO0002-Welcome.htm`, `media/photo.jpg`) — because each package zip is self-contained.
- Adds the launch as the first `<item>` regardless of document order. Other items follow in document order.
- For `navigation: "linear"`, optionally emit `<adlcp:prerequisites>` chains (deferred to phase 2 — see §9).

### 4.5 Bundle assembly — `downloadBundle`

In [`upload-media.js:1605`](upload-media.js#L1605), after the existing `generated/` and `media/` writes:

```js
// NEW — after the existing bundle assembly
if (currentAnalysis.scormScopes?.length) {
  for (const scope of currentAnalysis.scormScopes) {
    if (scope.skip) continue;
    const scopeZip = new JSZip();
    const scopeArtefacts = generatedArtefacts.filter(a =>
      currentAnalysis.blocks.find(b => b.filename === a.filename)?.scormScopeId === scope.id
    );
    const scopeMedia = uniqueMatchedMedia(currentAnalysis).filter(m =>
      // include media referenced by any block in this scope
      currentAnalysis.blocks
        .filter(b => b.scormScopeId === scope.id)
        .some(b => b.mediaRefs.some(r => r.matchedFile?.exportName === m.exportName))
    );
    scopeArtefacts.forEach(file => {
      const data = file.blob ?? file.content;
      scopeZip.file(`content/${file.filename}`, data);
    });
    scopeMedia.forEach(file => scopeZip.file(`media/${file.exportName}`, file.data));
    scopeZip.file('imsmanifest.xml', buildScopedManifest(scope, scopeArtefacts, scopeMedia));
    const blob = await scopeZip.generateAsync({ type: 'blob' });
    zip.file(`scorm-packages/${scope.id}.zip`, blob);
  }
}

// Keep the legacy combined manifest at root ONLY when there are no scopes
if (!currentAnalysis.scormScopes?.length) {
  const manifest = buildLegacyCombinedManifest(currentAnalysis, generatedArtefacts);
  if (manifest) zip.file('imsmanifest.xml', manifest);
}
```

### 4.6 UI panel changes

In `renderScorm` ([`upload-media.js:1390`](upload-media.js#L1390)):

- If `analysis.scormScopes?.length`, render one card per scope showing: id, launch, version, tracking, completion, navigation, block count, status (Ready / Skipped + reason).
- Else fall through to the existing keyword-summary view.

In `renderBlocks` ([`upload-media.js:1331`](upload-media.js#L1331)):

- If a block has `scormScopeId`, add a `<span class="mini-tag">scope: ${id}</span>` next to the filename tag so authors see at a glance which package each block belongs to.

The CSS classes already exist (`scorm-card`, `mini-tag`, `status-banner`). No styles need to be added.

### 4.7 `summary-report.txt` and `scorm-readiness.txt`

`buildSummaryReport` (existing function) — append a `SCORM packages` section listing each scope, its launch file, the block count, and any skip reason.

`scorm-readiness.txt` ([`upload-media.js:1614`](upload-media.js#L1614)) — when `scormScopes.length`, emit one block per scope:

```
SCORM package: CO0002
  Version:     1.2
  Launch:      CO0002-Welcome.htm
  Tracking:    completion-only
  Completion:  page-view
  Navigation:  free
  Blocks:      5 HTML, 0 worksheets, 0 documents
  Status:      READY
  Output:      scorm-packages/CO0002.zip

SCORM package: CO0003
  …
```

`blocks-metadata.json` ([`upload-media.js:1609`](upload-media.js#L1609)) — add `scormScopeId` to each block's serialised form.

---

## 5. Spec doc updates

| File | Change |
|---|---|
| [`specs/scorm-rules.md`](specs/scorm-rules.md) | Replace "Required SCORM decision list" section with the `<scorm>` block syntax. Add a "Scoping" section explaining sibling-marker semantics and the default-scope edge case. Keep the "Stop conditions" list and add: missing `<id>`, missing `<launch>`, launch file not in scope. |
| [`specs/source-authoring-guide.md`](specs/source-authoring-guide.md) | Replace section 7 ("Define the five SCORM decisions explicitly") with the new `<scorm>` block syntax. Add a new section showing a multi-course document. |
| [`specs/tag-rules.md`](specs/tag-rules.md) | Add `<scorm>` to the recognised block list. |
| [`how-to-guide.html`](how-to-guide.html) | Update the SCORM packaging section to show `<scorm>` block syntax instead of free-floating `key: "value"` lines. Add a "multi-course documents" callout. |
| [`CLAUDE.md`](CLAUDE.md) | Update the "Tagging rules" table to include the `<scorm>` row. Update the "SCORM packaging" section to describe scoped packages. |

---

## 6. Backwards compatibility

| Source document state | Behaviour after change |
|---|---|
| No `<scorm>` blocks, no SCORM keywords | No `imsmanifest.xml`, no `scorm-packages/`. Same as today. |
| No `<scorm>` blocks, mentions SCORM in prose | Legacy combined `imsmanifest.xml` at bundle root. Same as today. |
| One `<scorm>` block | Single `scorm-packages/<id>.zip`. No root `imsmanifest.xml`. |
| Multiple `<scorm>` blocks | One `scorm-packages/<id>.zip` per scope. No root `imsmanifest.xml`. |
| `<scorm>` block missing `<id>` or `<launch>` | Scope skipped with danger warning. Other scopes still build. |
| Content blocks before first `<scorm>` | Outputs build into `generated/` but excluded from any package, with warn-level warning. |

The "no root `imsmanifest.xml` when scopes exist" decision avoids confusion (which manifest is the deployable one?) but is a behavioural change for any author who currently relies on the combined manifest. Mitigation: clear release note + the existing `summary-report.txt` calls it out explicitly.

---

## 7. Test plan

### 7.1 Existing regression — must continue to pass

`node document-splitter/build-all.js` must still report:

> 32 blocks, 66 checks, 0 failures

This exercises the existing `CP4807 - Introduction to microcontrollers 05 04 26.docx` source, which has zero `<scorm>` blocks → must hit the legacy path unchanged.

### 7.2 New test fixtures

Add three new fixtures under `document-splitter/source/test-fixtures/`:

1. **`single-scorm.docx`** — one `<scorm>` block + three `<HTML>` blocks. Expected: one `scorm-packages/CO9991.zip` in bundle, no root manifest. Manifest contains exactly three `<item>` SCO entries, launch matches.
2. **`multi-scorm.docx`** — three `<scorm>` blocks, each followed by 2–4 content blocks. Expected: three zips under `scorm-packages/`, each self-contained, each launch resolves.
3. **`broken-scorm.docx`** — one `<scorm>` block missing `<id>`, one with a `<launch>` that points at a non-existent filename, one valid. Expected: only the valid scope produces a zip; two danger warnings; bundle still builds.

### 7.3 Extend `build-all.js`

Add three new test cases that load the fixtures, run `analyzeText`, run `downloadBundle` against an in-memory JSZip, and assert:

- `analysis.scormScopes.length` matches expected.
- `scope.blockOrder.length` matches expected.
- `scope.skip` matches expected.
- The bundle contains the expected entries under `scorm-packages/`.

The total check count after these additions becomes the new regression baseline. Update [`CLAUDE.md`](CLAUDE.md) "Regression testing" section accordingly.

### 7.4 Manual smoke test

After the code change, run the boss's `Microcontroller based courses 07 05 26.docx` through the live tool in the browser. Wrap each course's existing screen list in a `<scorm>` block and confirm three deployable zips drop into `scorm-packages/`. Upload one to a staging Moodle to confirm it actually launches.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Authors misplace a `<scorm>` block and silently mis-scope content | Medium | Render scope-id pills on every block in the UI; show scope→block list in `summary-report.txt`. |
| LMS rejects a generated package due to relative-path issue | Low | Manual smoke test on real LMS before sign-off; existing manifest XML structure is already known-good. |
| Smart quotes inside `<id>` produce slugs that confuse the LMS | Low | Reuse `sanitizeMediaFilename`-style normalisation for the `id` field (alphanumeric + hyphen + underscore only). Reject and warn on others. |
| Authors using legacy keyword-style notes break when they later add a `<scorm>` block | Low | Doc the migration in the release note. The keyword-only path keeps working as long as no `<scorm>` block exists. |
| `id` collision between courses across multiple uploads | N/A | The bundle is per-upload; collisions only matter within one source doc and are warned about (see §4.1.2). |

---

## 9. Out of scope (deferred to phase 2)

- **`navigation: "linear"` enforcement** — emitting `<adlcp:prerequisites>` chains. Current implementation will accept the value but produce a free-navigation manifest with a warning. Easy to add later.
- **`completion: "quiz-pass"`** — would require knowing which HTML block contains the quiz and what passing means. Defer until we have a `<quiz>` block type.
- **SCORM 2004 sequencing rules** — the `<schemaversion>` will say `2004` if requested but the manifest body stays SCORM 1.2-shaped. Adequate for most LMSs that "support 2004"; revisit if a real customer needs strict 2004 sequencing.
- **`<scorm>` blocks containing nested content blocks** (the wrapper-syntax alternative). Can be added later without breaking the sibling-marker syntax.

---

## 10. Open questions for stakeholder sign-off

Before starting implementation, confirm with the boss:

1. **Sibling-marker vs wrapper syntax** — is the sibling-marker `<scorm>…</scorm> + following blocks` model acceptable, or does he want the wrapper version where content blocks live physically inside the `<scorm>` tag? (Sibling marker is recommended; wrapper costs more dev time and demands more author discipline.)
2. **Default scope behaviour** — when content blocks appear before the first `<scorm>` block, should they (a) get an implicit default scope and produce a fallback combined manifest, (b) be excluded from SCORM but still produce raw outputs, or (c) be a hard error? The plan recommends (b).
3. **Deprecation of keyword-only path** — keep the legacy single-manifest behaviour for documents with no `<scorm>` blocks (recommended) or remove it now and force everyone onto the new syntax?
4. **Per-package zip vs flat folder** — should each scope be a real `.zip` ready to upload, or a folder under `scorm-packages/<id>/` that the user zips themselves? Real zip is recommended (LMSs want a single file to upload).
5. **`scorm-packages/` location** — at bundle root (recommended) or inside `generated/`?

---

## 11. Effort breakdown

| Task | Estimate |
|---|---|
| Parser regex + scope assignment + new field handling | 0.25 day |
| `analyzeScorm` + data-model refactor + warning paths | 0.25 day |
| Manifest builder split + scoped builder | 0.25 day |
| Bundle assembly per-package zip emission | 0.25 day |
| UI panel updates (renderScorm + renderBlocks scope tags) | 0.25 day |
| Test fixtures + `build-all.js` extensions + manual LMS smoke test | 0.5 day |
| Spec + how-to-guide + CLAUDE.md updates | 0.5 day |
| **Total** | **~2.25 days** |

Add ~0.5 day buffer for integration issues and cross-browser testing of the bundle download. Realistic delivery: **3 working days from the go-ahead.**

---

## 12. Files touched (final inventory)

```
document-splitter/upload-media.js          ← parser, analyser, manifest, bundle, UI
document-splitter/build-all.js             ← regression test extensions
document-splitter/how-to-guide.html        ← author-facing SCORM section
document-splitter/CLAUDE.md                ← rules table + SCORM packaging summary
document-splitter/specs/scorm-rules.md     ← block syntax + scoping rules
document-splitter/specs/source-authoring-guide.md  ← section 7 rewrite + multi-course example
document-splitter/specs/tag-rules.md       ← add <scorm> to recognised tags
document-splitter/source/test-fixtures/    ← three new test docx files (NEW directory)
  single-scorm.docx
  multi-scorm.docx
  broken-scorm.docx
```

No new dependencies. No changes to `index.html`, `styles.css`, or any other file.
