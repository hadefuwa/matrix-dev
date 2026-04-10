const fileInput = document.getElementById("fileInput");
const mediaInput = document.getElementById("mediaInput");
const dropzone = document.getElementById("dropzone");
const mediaDropzone = document.getElementById("mediaDropzone");
const previewBox = document.getElementById("previewBox");
const previewStatus = document.getElementById("previewStatus");
const blocksList = document.getElementById("blocksList");
const blocksCount = document.getElementById("blocksCount");
const outputsList = document.getElementById("outputsList");
const outputsCount = document.getElementById("outputsCount");
const scormPanel = document.getElementById("scormPanel");
const scormStatus = document.getElementById("scormStatus");
const mediaList = document.getElementById("mediaList");
const mediaCount = document.getElementById("mediaCount");
const warningsList = document.getElementById("warningsList");
const warningsCount = document.getElementById("warningsCount");
const fileMeta = document.getElementById("fileMeta");
const mediaMeta = document.getElementById("mediaMeta");
const actionsPanel = document.getElementById("actionsPanel");
const actionStatus = document.getElementById("actionStatus");
const generateBtn = document.getElementById("generateBtn");
const summaryBtn = document.getElementById("summaryBtn");
const bundleBtn = document.getElementById("bundleBtn");
const generatedPanel = document.getElementById("generatedPanel");
const generatedCount = document.getElementById("generatedCount");
const generatedList = document.getElementById("generatedList");

let currentSourceFile = "";
let currentSourceText = "";
let currentAnalysis = null;
let currentMediaZipName = "";
let currentMediaBundle = [];
let currentMediaIndex = new Map();
let currentMediaDuplicateNames = new Set();
let generatedArtefacts = [];
let activeObjectUrls = [];

const TAG_PATTERNS = [
  { label: "HTML", open: /<HTML>/gi, close: /<\/HTML>/gi },
  { label: "worksheet", open: /<worksheet>/gi, close: /<\/worksheet>/gi },
  { label: "document", open: /<document>/gi, close: /<\/document>/gi }
];

const MEDIA_PATTERN = /<(image|video|audio|datasheet|slides|resource)>\s*([^<>\n]+?)\s*<\/\1>/gi;

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (file) handleSourceFile(file);
});

mediaInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (file) handleMediaFile(file);
});

attachDropzone(dropzone, handleSourceFile);
attachDropzone(mediaDropzone, handleMediaFile);

generateBtn.addEventListener("click", () => {
  if (!currentAnalysis) return;
  generatedArtefacts = buildPrototypeArtefacts(currentAnalysis.blocks);
  renderGeneratedOutputs(generatedArtefacts);
  actionStatus.textContent = "Prototype outputs generated";
});

summaryBtn.addEventListener("click", () => {
  if (!currentAnalysis) return;
  downloadTextFile(`${baseName(currentSourceFile) || "prototype"}-summary-report.txt`, buildSummaryReport());
});

bundleBtn.addEventListener("click", async () => {
  if (!currentAnalysis) return;
  if (!generatedArtefacts.length) {
    generatedArtefacts = buildPrototypeArtefacts(currentAnalysis.blocks);
    renderGeneratedOutputs(generatedArtefacts);
  }
  await downloadBundle();
});

function attachDropzone(element, handler) {
  ["dragenter", "dragover"].forEach((name) => {
    element.addEventListener(name, (event) => {
      event.preventDefault();
      element.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((name) => {
    element.addEventListener(name, (event) => {
      event.preventDefault();
      element.classList.remove("is-dragover");
    });
  });

  element.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files || [];
    if (file) handler(file);
  });
}

async function handleSourceFile(file) {
  resetSourceState();
  currentSourceFile = file.name;

  if (!file.name.toLowerCase().endsWith(".docx")) {
    renderError("Please upload a Word .docx file. This prototype does not parse .doc or PDF files.");
    return;
  }

  fileMeta.innerHTML = `
    <span><strong>File:</strong> ${escapeHtml(file.name)}</span>
    <span><strong>Size:</strong> ${Math.max(1, Math.round(file.size / 1024))} KB</span>
    <span><strong>Last modified:</strong> ${new Date(file.lastModified).toLocaleString()}</span>
  `;

  previewStatus.textContent = "Reading DOCX";

  try {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    if (!zip.file("word/document.xml")) {
      renderError("The uploaded .docx could not be read as a standard Word document.");
      return;
    }

    currentSourceText = await extractReadableTextFromDocx(zip);
    currentAnalysis = applyMediaStateToAnalysis(analyzeText(currentSourceText));
    renderAnalysis(currentSourceText, currentAnalysis);
  } catch (error) {
    console.error(error);
    renderError("Something went wrong while reading the document. Try another .docx file or save the source again from Word.");
  }
}

async function handleMediaFile(file) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    renderMediaError("Please upload a .zip file for the companion media folder.");
    return;
  }

  revokeObjectUrls();
  generatedArtefacts = [];
  generatedPanel.hidden = true;
  currentMediaZipName = file.name;
  mediaMeta.innerHTML = `
    <span><strong>Media ZIP:</strong> ${escapeHtml(file.name)}</span>
    <span><strong>Size:</strong> ${Math.max(1, Math.round(file.size / 1024))} KB</span>
    <span><strong>Last modified:</strong> ${new Date(file.lastModified).toLocaleString()}</span>
  `;

  try {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const mediaFiles = [];

    await Promise.all(Object.values(zip.files).map(async (entry) => {
      if (entry.dir || entry.name.startsWith("__MACOSX/")) return;
      const exportName = basenameOnly(entry.name);
      if (!exportName) return;

      const data = await entry.async("uint8array");
      const mime = getMimeType(exportName);
      const url = createObjectUrl(new Blob([data], { type: mime }));
      mediaFiles.push({ path: entry.name, exportName, key: normalizeMediaName(exportName), size: data.byteLength, mime, data, url });
    }));

    currentMediaBundle = mediaFiles.sort((a, b) => a.exportName.localeCompare(b.exportName));
    const indexed = buildMediaIndex(currentMediaBundle);
    currentMediaIndex = indexed.index;
    currentMediaDuplicateNames = indexed.duplicates;

    if (currentAnalysis) {
      currentAnalysis = applyMediaStateToAnalysis(currentAnalysis);
      renderAnalysis(currentSourceText, currentAnalysis);
      generatedArtefacts = buildPrototypeArtefacts(currentAnalysis.blocks);
      renderGeneratedOutputs(generatedArtefacts);
    } else {
      renderMediaPanel(null);
      actionStatus.textContent = "Media ZIP loaded";
    }
  } catch (error) {
    console.error(error);
    renderMediaError("The media ZIP could not be read. Try compressing the folder again and re-uploading it.");
  }
}

async function extractReadableTextFromDocx(zip) {
  const xmlEntries = Object.keys(zip.files)
    .filter((name) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  const parts = [];
  for (const entryName of xmlEntries) {
    const xmlString = await zip.file(entryName)?.async("string");
    if (!xmlString) continue;
    const extracted = extractReadableText(xmlString);
    if (extracted) parts.push(extracted);
  }

  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractReadableText(xmlString) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");
  const paragraphs = [];
  const nodes = xml.getElementsByTagNameNS("*", "p");

  for (const paragraph of nodes) {
    const textNodes = paragraph.getElementsByTagNameNS("*", "t");
    let line = "";
    for (const node of textNodes) line += node.textContent || "";
    const tabNodes = paragraph.getElementsByTagNameNS("*", "tab");
    for (const node of tabNodes) line += node.textContent || " ";
    line = line.replace(/\u00a0/g, " ").trim();
    if (line) paragraphs.push(line);
  }

  return paragraphs.join("\n");
}
function analyzeText(text) {
  const warnings = [];
  const blocks = [];
  const duplicateMap = new Map();
  const tokenPattern = /<filename>\s*\"?([^\"<>\n]+)\"?\s*<\/filename>|<(HTML|worksheet|document)>|<\/(HTML|worksheet|document)>/gi;
  let currentBlock = null;
  let lastIndex = 0;
  let match;
  let sawTagToken = false;

  while ((match = tokenPattern.exec(text)) !== null) {
    const tokenIndex = match.index ?? 0;
    const between = text.slice(lastIndex, tokenIndex);
    if (currentBlock && between) currentBlock.bodyParts.push(between);

    const filenameValue = match[1];
    const openTag = match[2];
    const closeTag = match[3];
    const lineNumber = lineNumberAt(text, tokenIndex);

    if (filenameValue) {
      sawTagToken = true;
      if (!currentBlock) {
        warnings.push({ level: "warn", title: "Filename found outside a block", detail: `${sanitizeFilenameValue(filenameValue)} appears at line ${lineNumber} but is not inside <HTML>, <worksheet>, or <document>.` });
      } else if (!currentBlock.filename) {
        currentBlock.filename = sanitizeFilenameValue(filenameValue);
      }
    } else if (openTag) {
      sawTagToken = true;
      if (currentBlock) {
        warnings.push({ level: "danger", title: `Nested or interrupted ${currentBlock.tagType} block`, detail: `A new <${openTag}> tag was found at line ${lineNumber} before <${currentBlock.tagType}> was closed${currentBlock.filename ? ` for ${currentBlock.filename}` : ""}.` });
        finalizeBlock(currentBlock, blocks, warnings, duplicateMap);
      }
      currentBlock = { tagType: openTag, filename: "", bodyParts: [], rawOpenIndex: tokenIndex, startLine: lineNumber };
    } else if (closeTag) {
      sawTagToken = true;
      if (!currentBlock) {
        warnings.push({ level: "warn", title: `Extra closing ${closeTag} tag`, detail: `A closing </${closeTag}> tag was found at line ${lineNumber} with no matching opening tag.` });
      } else if (currentBlock.tagType.toLowerCase() !== closeTag.toLowerCase()) {
        warnings.push({ level: "danger", title: "Mismatched closing tag", detail: `Line ${lineNumber} closes </${closeTag}> while the open block is <${currentBlock.tagType}>${currentBlock.filename ? ` for ${currentBlock.filename}` : ""}.` });
        finalizeBlock(currentBlock, blocks, warnings, duplicateMap);
        currentBlock = null;
      } else {
        currentBlock.endLine = lineNumber;
        finalizeBlock(currentBlock, blocks, warnings, duplicateMap);
        currentBlock = null;
      }
    }

    lastIndex = tokenPattern.lastIndex;
  }

  if (currentBlock) {
    currentBlock.bodyParts.push(text.slice(lastIndex));
    warnings.push({ level: "danger", title: `Unclosed ${currentBlock.tagType} block`, detail: `The <${currentBlock.tagType}> block${currentBlock.filename ? ` for ${currentBlock.filename}` : ""} starts at line ${currentBlock.startLine} but has no matching closing tag.` });
    finalizeBlock(currentBlock, blocks, warnings, duplicateMap);
  }

  duplicateMap.forEach((count, filename) => {
    if (count > 1) warnings.push({ level: "warn", title: "Duplicate filename", detail: `${filename} appears ${count} times across detected blocks.` });
  });

  if (sawTagToken && !blocks.length) warnings.push({ level: "warn", title: "Tag-like text found but no valid blocks built", detail: "The document appears to contain tags, but the prototype could not form complete blocks from them." });

  blocks.sort((a, b) => a.rawOpenIndex - b.rawOpenIndex).forEach((block, index) => { block.order = index + 1; });
  return { blocks, warnings, scorm: analyzeScorm(text, blocks), media: emptyMediaState() };
}

function applyMediaStateToAnalysis(analysis) {
  const mediaWarnings = [];
  const references = [];
  const matchedKeys = new Set();
  const referencedNames = new Set();

  if (currentMediaDuplicateNames.size) mediaWarnings.push({ level: "warn", title: "Duplicate media names in ZIP", detail: `The media ZIP contains duplicate basenames for: ${[...currentMediaDuplicateNames].sort().join(", ")}.` });

  analysis.blocks.forEach((block) => {
    block.mediaRefs = block.mediaRefs.map((ref) => {
      const key = normalizeMediaName(ref.filename);
      let status = "missing";
      let matchedFile = null;
      let detail = "No media ZIP has been uploaded yet.";
      if (currentMediaDuplicateNames.has(key)) {
        status = "ambiguous";
        detail = `Multiple files named ${ref.filename} were found in the media ZIP.`;
      } else if (currentMediaIndex.has(key)) {
        status = "matched";
        matchedFile = currentMediaIndex.get(key);
        detail = `Matched to ${matchedFile.exportName}.`;
        matchedKeys.add(key);
      } else if (currentMediaBundle.length) {
        detail = `No file named ${ref.filename} was found in the uploaded media ZIP.`;
      }

      referencedNames.add(key);
      const enriched = { ...ref, status, matchedFile, detail };
      references.push({ ...enriched, blockOrder: block.order, blockFilename: block.filename || "(missing filename)" });
      return enriched;
    });
  });

  references.forEach((ref) => {
    if (ref.status === "missing") mediaWarnings.push({ level: "warn", title: "Missing media file", detail: `Block ${ref.blockOrder}${ref.blockFilename ? ` (${ref.blockFilename})` : ""} references ${ref.filename} in <${ref.tag}> but no matching media file is available.` });
    else if (ref.status === "ambiguous") mediaWarnings.push({ level: "warn", title: "Ambiguous media file", detail: `Block ${ref.blockOrder}${ref.blockFilename ? ` (${ref.blockFilename})` : ""} references ${ref.filename} in <${ref.tag}>, but more than one ZIP entry shares that basename.` });
  });

  if (!currentMediaBundle.length && references.length) mediaWarnings.unshift({ level: "warn", title: "Media ZIP not uploaded", detail: "The source document references explicit media tags, but no companion media ZIP has been loaded yet." });

  analysis.media = {
    zipName: currentMediaZipName,
    loadedFiles: currentMediaBundle.length,
    references,
    matchedFiles: currentMediaBundle.filter((file) => matchedKeys.has(file.key)),
    missingCount: references.filter((ref) => ref.status === "missing").length,
    ambiguousCount: references.filter((ref) => ref.status === "ambiguous").length,
    unusedFiles: currentMediaBundle.filter((file) => !referencedNames.has(file.key)),
    warnings: dedupeWarnings(mediaWarnings)
  };
  return analysis;
}

function finalizeBlock(rawBlock, blocks, warnings, duplicateMap) {
  const rawBody = sanitizeBodyText(rawBlock.bodyParts.join("").trim());
  const mediaRefs = extractMediaReferences(rawBody);
  const body = sanitizeBodyText(stripMediaTags(rawBody).trim());
  const filename = sanitizeFilenameValue(rawBlock.filename);
  const classification = inferClassification(body, filename);
  const output = inferOutput(rawBlock.tagType, filename);

  if (!filename) warnings.push({ level: "warn", title: `Missing filename in ${rawBlock.tagType} block`, detail: `The <${rawBlock.tagType}> block starting at line ${rawBlock.startLine} has no <filename> value.` });
  else duplicateMap.set(filename, (duplicateMap.get(filename) || 0) + 1);

  blocks.push({
    order: blocks.length + 1,
    tagType: rawBlock.tagType,
    filename,
    excerpt: makeExcerpt(body, 220),
    body,
    classification,
    outputType: output.type,
    destination: output.destination,
    rawOpenIndex: rawBlock.rawOpenIndex,
    mediaRefs,
    startLine: rawBlock.startLine,
    endLine: rawBlock.endLine || rawBlock.startLine
  });
}

function inferClassification(content, filename) {
  const sample = `${filename} ${content}`.toLowerCase();
  if (/(^|[\s-])(tn|sow|prep)([\s.-]|$)/i.test(filename) || /teacher'?s?\s+notes?|marking scheme|scheme of work|preparation notes?/i.test(sample)) return "teacher content";
  if (sample.includes("worksheet") || sample.includes("learner")) return "learner content";
  if (sample.includes("homework")) return "homework";
  if (sample.includes("assessment") || sample.includes("quiz") || sample.includes("test")) return "assessment";
  if (sample.includes("certificate")) return "certificate";
  if (sample.includes("project")) return "project brief";
  if (sample.includes("plan") || sample.includes("spec") || sample.includes("instruction")) return "planning/specification";
  return "learner content";
}

function inferOutput(tagType, filename) {
  if (tagType.toLowerCase() === "html") return { type: "Learner HTML", destination: filename ? "outputs/html/" : "outputs/html/ (proposed)" };
  return { type: "Worksheet or document output", destination: filename ? "outputs/docx/" : "outputs/docx/ (proposed)" };
}

function analyzeScorm(text, blocks) {
  const lower = text.toLowerCase();
  const checks = [
    { label: "SCORM version", ok: /(scorm\s*1\.2|scorm\s*2004)/i.test(text), missing: "Specify SCORM 1.2 or SCORM 2004 explicitly." },
    { label: "Launch file", ok: /launch|index\.html|start/i.test(text), missing: "Define which file should launch first." },
    { label: "Manifest data", ok: /manifest|imsmanifest|identifier|resource/i.test(text), missing: "Add package metadata and manifest structure." },
    { label: "Completion model", ok: /completion|passed|mastery|score/i.test(text), missing: "Define how completion or passing should be measured." },
    { label: "Tracking model", ok: /tracking|suspend_data|bookmark|progress/i.test(text), missing: "Define what learner progress should be tracked." },
    { label: "Navigation / sequencing", ok: /sequencing|navigation|next|previous/i.test(text), missing: "Define learner navigation and sequencing rules." }
  ];
  const ready = checks.every((item) => item.ok) && blocks.some((block) => block.filename);
  return {
    checks,
    ready,
    summary: ready ? "This prototype found the main decisions needed for packaging, but a real build would still need package validation." : lower.includes("scorm") ? "Some SCORM-related notes were found, but important packaging decisions are still missing." : "No clear SCORM specification was found in the uploaded document."
  };
}

function renderAnalysis(text, analysis) {
  previewStatus.textContent = "Preview ready";
  previewBox.className = "preview-box";
  previewBox.textContent = text || "No readable text could be extracted.";
  renderBlocks(analysis.blocks);
  renderOutputs(analysis.blocks);
  renderScorm(analysis.scorm);
  renderMediaPanel(analysis);
  const extraWarnings = [...(analysis.blocks.length === 0 && text ? [{ level: "warn", title: "No supported tags found", detail: "The document preview was extracted, but no supported custom blocks were detected." }] : []), ...analysis.media.warnings];
  renderWarnings(analysis.warnings, extraWarnings);
  actionsPanel.hidden = false;
  setActionButtons(true);
  actionStatus.textContent = "Analysis complete";
}
function renderBlocks(blocks) {
  blocksCount.textContent = `${blocks.length} block${blocks.length === 1 ? "" : "s"}`;
  if (!blocks.length) {
    blocksList.className = "empty-state";
    blocksList.innerHTML = "No supported tagged blocks were detected in this preview.";
    return;
  }

  blocksList.className = "block-list";
  blocksList.innerHTML = blocks.map((block) => `
    <article class="block-card">
      <div class="block-top">
        <div><h3>Block ${block.order}</h3><p>${escapeHtml(block.outputType)}</p></div>
        <div class="block-meta">
          <span class="mini-tag">${escapeHtml(block.tagType)}</span>
          <span class="mini-tag success">${escapeHtml(block.classification)}</span>
          ${block.filename ? `<span class="mini-tag">${escapeHtml(block.filename)}</span>` : `<span class="mini-tag warn">filename missing</span>`}
          <span class="mini-tag">lines ${block.startLine}-${block.endLine}</span>
          ${block.mediaRefs.length ? `<span class="mini-tag">${block.mediaRefs.length} media</span>` : `<span class="mini-tag warn">no media tags</span>`}
        </div>
      </div>
      <div class="excerpt">${escapeHtml(block.excerpt || "(No visible text inside block)")}</div>
      <div class="meta-grid">
        <div class="meta-box"><strong>Filename</strong><div>${block.filename ? `<code>${escapeHtml(block.filename)}</code>` : "No filename detected"}</div></div>
        <div class="meta-box"><strong>Destination</strong><div><code>${escapeHtml(block.destination)}</code></div></div>
      </div>
      <div class="media-inline-note">${block.mediaRefs.length ? `Media refs: ${block.mediaRefs.map((ref) => `&lt;${escapeHtml(ref.tag)}&gt;${escapeHtml(ref.filename)}&lt;/${escapeHtml(ref.tag)}&gt;`).join(", ")}` : "Media debug: no explicit media tags detected in this block."}</div>
    </article>
  `).join("");
}

function renderOutputs(blocks) {
  const valid = blocks.filter((block) => block.filename);
  outputsCount.textContent = `${valid.length} proposed`;
  if (!valid.length) {
    outputsList.className = "empty-state";
    outputsList.innerHTML = "Valid outputs will appear here when blocks include usable filenames.";
    return;
  }

  outputsList.className = "output-list";
  outputsList.innerHTML = valid.map((block) => {
    const matchedMedia = block.mediaRefs.filter((ref) => ref.status === "matched").length;
    const unmatchedMedia = block.mediaRefs.length - matchedMedia;
    return `
      <article class="output-card">
        <div class="output-top">
          <div><h3>${escapeHtml(block.filename)}</h3><p>${escapeHtml(block.outputType)}</p></div>
          <div class="output-meta"><span class="mini-tag success">${escapeHtml(block.tagType)}</span>${block.mediaRefs.length ? `<span class="mini-tag">${block.mediaRefs.length} refs</span>` : ""}</div>
        </div>
        <div class="meta-grid">
          <div class="meta-box"><strong>Likely folder</strong><div><code>${escapeHtml(block.destination)}</code></div></div>
          <div class="meta-box"><strong>Classification</strong><div>${escapeHtml(block.classification)}</div></div>
        </div>
        ${block.mediaRefs.length ? `<div class="meta-grid"><div class="meta-box"><strong>Matched media</strong><div>${matchedMedia}</div></div><div class="meta-box"><strong>Missing / ambiguous</strong><div>${unmatchedMedia}</div></div></div>` : ""}
        <div class="excerpt" style="margin-top:0.9rem;">${escapeHtml(makeExcerpt(block.body, 160) || "(No visible text inside block)")}</div>
      </article>
    `;
  }).join("");
}

function renderScorm(scorm) {
  scormStatus.textContent = scorm.ready ? "Potentially packageable" : "Not ready";
  scormPanel.className = "scorm-grid";
  scormPanel.innerHTML = `
    <div class="status-banner" style="grid-column: 1 / -1;"><strong>${escapeHtml(scorm.summary)}</strong>This prototype highlights missing decisions. It does not claim SCORM compliance.</div>
    ${scorm.checks.map((item) => `<article class="scorm-card"><div class="block-top"><h3>${escapeHtml(item.label)}</h3><span class="mini-tag ${item.ok ? "success" : "warn"}">${item.ok ? "Found" : "Missing"}</span></div><p>${item.ok ? "Relevant wording or signals were found in the uploaded document." : escapeHtml(item.missing)}</p></article>`).join("")}
  `;
}

function renderMediaPanel(analysis) {
  if (!analysis) {
    mediaCount.textContent = currentMediaBundle.length ? `${currentMediaBundle.length} files loaded` : "0 references";
    if (!currentMediaBundle.length) {
      mediaList.className = "empty-state";
      mediaList.textContent = "Upload a source document and optional media ZIP to inspect explicit media references.";
      return;
    }

    mediaList.className = "media-list";
    mediaList.innerHTML = `<div class="status-banner"><strong>${escapeHtml(currentMediaZipName || "Media ZIP loaded")}</strong>${currentMediaBundle.length} files were loaded from the media ZIP. Upload a source document to match explicit media tags.</div>`;
    return;
  }

  const mediaState = analysis.media;
  mediaCount.textContent = `${mediaState.references.length} reference${mediaState.references.length === 1 ? "" : "s"}`;
  if (!mediaState.references.length && !mediaState.loadedFiles) {
    mediaList.className = "empty-state";
    mediaList.textContent = "No explicit media tags were found, and no media ZIP has been loaded.";
    return;
  }

  mediaList.className = "media-list";
  mediaList.innerHTML = `
    <div class="media-summary">
      <div class="media-stat"><strong>${mediaState.loadedFiles}</strong><span>files loaded from ZIP</span></div>
      <div class="media-stat"><strong>${mediaState.references.length}</strong><span>references found in DOCX</span></div>
      <div class="media-stat"><strong>${mediaState.matchedFiles.length}</strong><span>matched media files</span></div>
      <div class="media-stat"><strong>${mediaState.missingCount + mediaState.ambiguousCount}</strong><span>missing or ambiguous refs</span></div>
    </div>
    ${mediaState.references.length ? mediaState.references.map((ref) => `
      <article class="media-card">
        <div class="block-top"><div><h3>${escapeHtml(ref.filename)}</h3><p>Block ${ref.blockOrder} • ${escapeHtml(ref.blockFilename)} • <code>&lt;${escapeHtml(ref.tag)}&gt;</code> reference</p></div><span class="mini-tag ${ref.status === "matched" ? "success" : "warn"}">${ref.status === "matched" ? "Matched" : ref.status === "ambiguous" ? "Ambiguous" : "Missing"}</span></div>
        <p>${escapeHtml(ref.detail)}</p>
        ${ref.matchedFile ? `<div class="meta-grid"><div class="meta-box"><strong>ZIP entry</strong><div><code>${escapeHtml(ref.matchedFile.path)}</code></div></div><div class="meta-box"><strong>Export path</strong><div><code>media/${escapeHtml(ref.matchedFile.exportName)}</code></div></div></div><div class="media-link-row"><a class="download-link" href="${escapeHtml(ref.matchedFile.url)}" download="${escapeHtml(ref.matchedFile.exportName)}">Download media</a></div>` : ""}
      </article>
    `).join("") : `<article class="media-card"><div class="block-top"><h3>No explicit media refs in source</h3><span class="mini-tag">${mediaState.loadedFiles} loaded</span></div><p>The media ZIP is loaded, but the current source document contains no explicit media tags such as <code>&lt;image&gt;file.jpg&lt;/image&gt;</code>.</p></article>`}
    ${mediaState.unusedFiles.length ? `<article class="media-card"><div class="block-top"><h3>Unused media in ZIP</h3><span class="mini-tag">${mediaState.unusedFiles.length} unused</span></div><p>These files are loaded but not referenced by any explicit media tag in the source.</p><div class="excerpt">${escapeHtml(mediaState.unusedFiles.map((file) => file.exportName).join(", "))}</div></article>` : ""}
  `;
}

function renderWarnings(primaryWarnings, extraWarnings) {
  const allWarnings = dedupeWarnings([...primaryWarnings, ...extraWarnings]);
  warningsCount.textContent = `${allWarnings.length} warning${allWarnings.length === 1 ? "" : "s"}`;
  if (!allWarnings.length) {
    warningsList.className = "empty-state";
    warningsList.innerHTML = "No obvious problems were detected in this prototype pass.";
    return;
  }

  warningsList.className = "warning-list";
  warningsList.innerHTML = allWarnings.map((warning) => `<article class="warning-card ${warning.level}"><div class="block-top"><h3>${escapeHtml(warning.title)}</h3><span class="mini-tag ${warning.level === "danger" ? "danger" : "warn"}">${warning.level === "danger" ? "Error" : "Warning"}</span></div><p>${escapeHtml(warning.detail)}</p></article>`).join("");
}

function renderGeneratedOutputs(files) {
  generatedPanel.hidden = false;
  generatedCount.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;
  if (!files.length) {
    generatedList.className = "empty-state";
    generatedList.textContent = "No prototype artefacts were generated from this source.";
    return;
  }

  generatedList.className = "generated-list";
  generatedList.innerHTML = files.map((file) => `<article class="generated-card"><div class="generated-card-top"><div><h3>${escapeHtml(file.filename)}</h3><p>${escapeHtml(file.outputLabel)}</p></div><a class="download-link" href="${escapeHtml(file.url)}" download="${escapeHtml(file.filename)}">Download</a></div><div class="meta-grid"><div class="meta-box"><strong>Source block</strong><div>${escapeHtml(file.tagType)}</div></div><div class="meta-box"><strong>Status</strong><div>${escapeHtml(file.status)}</div></div></div></article>`).join("");
}
function renderError(message) {
  previewStatus.textContent = "Upload failed";
  previewBox.className = "empty-state";
  previewBox.textContent = message;
  blocksList.className = "empty-state";
  blocksList.textContent = "No blocks available.";
  outputsList.className = "empty-state";
  outputsList.textContent = "No outputs available.";
  scormPanel.className = "empty-state";
  scormPanel.textContent = "SCORM readiness could not be assessed.";
  mediaList.className = "empty-state";
  mediaList.textContent = currentMediaBundle.length ? "Media ZIP is loaded. Upload a valid source document to match explicit media tags." : "Upload a source document and optional media ZIP to inspect explicit media references.";
  actionsPanel.hidden = false;
  setActionButtons(false);
  actionStatus.textContent = "Waiting for a valid file";
  renderWarnings([{ level: "danger", title: "File could not be processed", detail: message }], []);
}

function renderMediaError(message) {
  currentMediaZipName = "";
  currentMediaBundle = [];
  currentMediaIndex = new Map();
  currentMediaDuplicateNames = new Set();
  mediaMeta.innerHTML = `<span>${escapeHtml(message)}</span>`;
  if (currentAnalysis) {
    currentAnalysis = applyMediaStateToAnalysis(currentAnalysis);
    renderAnalysis(currentSourceText, currentAnalysis);
  } else {
    renderMediaPanel(null);
  }
}

function buildPrototypeArtefacts(blocks) {
  return blocks.filter((block) => block.filename).map((block) => {
    const tag = block.tagType.toLowerCase();
    const filename = resolvePrototypeFilename(block);
    const isHtml = tag === "html" || /\.html?$/i.test(filename);
    const content = isHtml ? buildPrototypeHtml(block, filename) : buildPrototypeText(block);
    const mime = isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
    return { filename, tagType: block.tagType, outputLabel: isHtml ? "Prototype HTML preview" : "Prototype text preview", status: `${block.mediaRefs.filter((ref) => ref.status === "matched").length} media matched`, content, mime, url: createDownloadUrl(content, mime) };
  });
}

function resolvePrototypeFilename(block) {
  const original = sanitizeFilenameValue(block.filename);
  const lower = original.toLowerCase();
  if (block.tagType.toLowerCase() === "html") return lower.endsWith(".html") || lower.endsWith(".htm") ? original : `${original}.htm`;
  if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith(".txt")) return original;
  return `${original.replace(/\.[^.]+$/, "") || original}.html`;
}

function buildPrototypeHtml(block, filename) {
  const display = deriveDisplayContent(block, filename);
  const leadMedia = display.leadMedia;
  const remainingMedia = display.remainingMedia;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(filename)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: linear-gradient(180deg, #eef4ff 0%, #f8fafc 100%); color: #14213d; }
    main { max-width: 1120px; margin: 0 auto; padding: 2rem 1rem 3rem; }
    .sheet { background: #ffffff; border: 1px solid #d5e1f8; border-radius: 24px; overflow: hidden; box-shadow: 0 22px 60px rgba(37, 99, 235, 0.12); }
    .topbar { padding: 1rem 1.25rem; background: #f7faff; border-bottom: 1px solid #dbe7ff; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .topbar span { font-size: 0.8rem; color: #476184; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); gap: 1.5rem; padding: 1.75rem; align-items: start; }
    .eyebrow { display: inline-block; padding: 0.35rem 0.65rem; border-radius: 999px; background: #e0ecff; color: #1d4ed8; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    h1 { margin: 0.8rem 0 0.35rem; font-size: clamp(2rem, 4vw, 3.15rem); line-height: 0.96; color: #102038; }
    .subtitle { margin: 0; font-size: 1.15rem; line-height: 1.35; color: #385170; font-weight: 600; }
    .summary { margin-top: 1.1rem; font-size: 1rem; line-height: 1.75; color: #455d7a; }
    .hero-media { background: #fbfdff; border: 1px solid #dbe7ff; border-radius: 20px; padding: 0.9rem; min-height: 220px; }
    .hero-media img, .hero-media video, .hero-media audio { width: 100%; max-width: 100%; border-radius: 14px; display: block; }
    .media-label { display: block; margin-bottom: 0.55rem; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #5b7096; }
    .meta { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 0.75rem; padding: 0 1.75rem 1.25rem; }
    .meta div { background: #f8fbff; border: 1px solid #dbe5ff; border-radius: 14px; padding: 0.85rem; }
    .meta strong { display: block; font-size: 12px; text-transform: uppercase; color: #5b7096; margin-bottom: 0.25rem; }
    .content { display: grid; gap: 1rem; padding: 0 1.75rem 1.75rem; }
    .content-section { background: #fbfdff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 1rem 1.1rem; }
    .content-section h2 { margin: 0 0 0.65rem; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: #1d4ed8; }
    .content-section p, .content-section li { margin: 0 0 0.7rem; line-height: 1.75; color: #334155; }
    .content-section p:last-child, .content-section li:last-child { margin-bottom: 0; }
    .content-section ul { margin: 0; padding-left: 1.2rem; }
    .media-stack { display: grid; gap: 0.9rem; }
    .media-item { background: #fbfdff; border: 1px solid #dbe5ff; border-radius: 18px; padding: 1rem; }
    .media-item strong { display: inline-block; margin-bottom: 0.35rem; }
    .media-item img, .media-item video, .media-item audio { width: 100%; max-width: 100%; margin-top: 0.75rem; border-radius: 12px; display: block; }
    .media-item a { color: #1d4ed8; }
    @media (max-width: 820px) {
      .hero { grid-template-columns: 1fr; }
      .meta { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <div class="sheet">
      <div class="topbar">
        <span>Prototype browser output</span>
        <span>Source tag: ${escapeHtml(block.tagType)}</span>
        <span>Export file: ${escapeHtml(filename)}</span>
      </div>
      <section class="hero">
        <div>
          <span class="eyebrow">${block.tagType === "HTML" ? "Learner HTML prototype" : "Worksheet / document prototype"}</span>
          <h1>${escapeHtml(display.title)}</h1>
          ${display.subtitle ? `<p class="subtitle">${escapeHtml(display.subtitle)}</p>` : ""}
          <p class="summary">This preview was generated from the tagged DOCX source and will include any explicitly matched media files from the uploaded ZIP.</p>
        </div>
        ${leadMedia ? `<aside class="hero-media"><span class="media-label">Lead media</span>${renderSingleMediaHtml(leadMedia)}</aside>` : `<aside class="hero-media"><span class="media-label">Lead media</span><p style="margin:0;color:#64748b;line-height:1.7;">No matched lead media was available for this block. Use an explicit tag like <code>&lt;image&gt;photo.jpg&lt;/image&gt;</code> and upload the matching file in the media ZIP.</p></aside>`}
      </section>
      <div class="meta">
        <div><strong>Source block</strong>${escapeHtml(block.tagType)}</div>
        <div><strong>Classification</strong>${escapeHtml(block.classification)}</div>
        <div><strong>Destination</strong>${escapeHtml(block.destination)}</div>
      </div>
      <div class="content">
        <section class="content-section">
          <h2>Content</h2>
          ${renderBodyContentHtml(display.contentLines)}
        </section>
        ${remainingMedia.length ? `<section class="content-section"><h2>Attached media</h2>${renderPrototypeMediaHtml(remainingMedia)}</section>` : ""}
        ${display.missingMedia.length ? `<section class="content-section"><h2>Missing media refs</h2>${display.missingMedia.map((ref) => `<p><strong>&lt;${escapeHtml(ref.tag)}&gt;</strong> ${escapeHtml(ref.filename)}: ${escapeHtml(ref.detail)}</p>`).join("")}</section>` : ""}
      </div>
    </div>
  </main>
</body>
</html>`;
}

function renderPrototypeMediaHtml(mediaRefs) {
  if (!mediaRefs.length) return "";
  return `<section class="media-stack">${mediaRefs.map((ref) => `<div class="media-item">${renderSingleMediaHtml(ref)}</div>`).join("")}</section>`;
}

function buildPrototypeText(block) {
  return [
    `Prototype output: ${block.filename}`,
    `Source block type: ${block.tagType}`,
    `Classification: ${block.classification}`,
    `Proposed destination: ${block.destination}`,
    "",
    "Content preview:",
    block.body,
    "",
    "Media references:",
    ...(block.mediaRefs.length ? block.mediaRefs.map((ref) => `- <${ref.tag}> ${ref.filename}: ${ref.status.toUpperCase()}${ref.matchedFile ? ` -> media/${ref.matchedFile.exportName}` : ""}`) : ["- None"])
  ].join("\n");
}

function buildSummaryReport() {
  if (!currentAnalysis) return "";
  const filenames = currentAnalysis.blocks.filter((block) => block.filename).map((block) => block.filename);
  const warnings = dedupeWarnings([...currentAnalysis.warnings, ...currentAnalysis.media.warnings]);
  const missingDecisions = currentAnalysis.scorm.checks.filter((item) => !item.ok).map((item) => `- ${item.label}: ${item.missing}`);
  const proposed = currentAnalysis.blocks.length ? currentAnalysis.blocks.map((block) => `- Block ${block.order}: ${block.filename || "(missing filename)"} -> ${block.outputType} -> ${block.destination} (lines ${block.startLine}-${block.endLine})`) : ["- No supported tagged blocks detected."];
  return [
    "Tagged DOCX Prototype Summary",
    "============================",
    `Source file: ${currentSourceFile || "Unknown"}`,
    `Media ZIP: ${currentMediaZipName || "None loaded"}`,
    `Detected blocks: ${currentAnalysis.blocks.length}`,
    `Valid filenames: ${filenames.length}`,
    "",
    "Filenames found:",
    ...(filenames.length ? filenames.map((name) => `- ${name}`) : ["- None"]),
    "",
    "Warnings and errors:",
    ...(warnings.length ? warnings.map((warning) => `- [${warning.level.toUpperCase()}] ${warning.title}: ${warning.detail}`) : ["- No obvious warnings detected."]),
    "",
    "Proposed outputs:",
    ...proposed,
    "",
    "Media summary:",
    `- Files loaded from ZIP: ${currentAnalysis.media.loadedFiles}`,
    `- Explicit media refs: ${currentAnalysis.media.references.length}`,
    `- Matched media: ${currentAnalysis.media.matchedFiles.length}`,
    `- Missing refs: ${currentAnalysis.media.missingCount}`,
    `- Ambiguous refs: ${currentAnalysis.media.ambiguousCount}`,
    `- Unused media files: ${currentAnalysis.media.unusedFiles.length}`,
    "",
    "SCORM readiness:",
    `- ${currentAnalysis.scorm.summary}`,
    "",
    "Missing SCORM decisions:",
    ...(missingDecisions.length ? missingDecisions : ["- None detected by the prototype."]),
    "",
    "Prototype note:",
    "- Worksheet and document outputs may be represented as stand-in HTML or text previews in this browser-only demo."
  ].join("\n");
}
function buildBasicManifest(analysis, artefacts) {
  if (!analysis || !artefacts.length) return "";
  const htmlArtefacts = artefacts.filter((file) => /\.html?$/i.test(file.filename));
  if (!htmlArtefacts.length) return "";

  const packageId = `${baseName(currentSourceFile) || "prototype"}-package`.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "prototype-package";
  const orgId = `${packageId}-org`;
  const title = baseName(currentSourceFile) || "Prototype SCORM Package";
  const artefactEntries = artefacts.map((file, index) => ({ resourceId: `res-${index + 1}`, href: `generated/${file.filename}`, scormType: file.tagType.toLowerCase() === "html" ? "sco" : "asset", title: file.filename }));
  const mediaEntries = uniqueMatchedMedia(analysis).map((file, index) => ({ resourceId: `media-res-${index + 1}`, href: `media/${file.exportName}`, scormType: "asset", title: file.exportName }));

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeXml(packageId)}"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 ims_xml.xsd
  http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="${escapeXml(orgId)}">
    <organization identifier="${escapeXml(orgId)}">
      <title>${escapeXml(title)}</title>
${artefactEntries.filter((entry) => entry.scormType === "sco").map((entry, index) => `      <item identifier="item-${index + 1}" identifierref="${entry.resourceId}"><title>${escapeXml(entry.title)}</title></item>`).join("\n")}
    </organization>
  </organizations>
  <resources>
${[...artefactEntries, ...mediaEntries].map((entry) => `    <resource identifier="${entry.resourceId}" type="webcontent" adlcp:scormtype="${entry.scormType}" href="${escapeXml(entry.href)}"><file href="${escapeXml(entry.href)}" /></resource>`).join("\n")}
  </resources>
</manifest>`;
}

async function downloadBundle() {
  const zip = new JSZip();
  const matchedMedia = uniqueMatchedMedia(currentAnalysis);
  zip.file("summary-report.txt", buildSummaryReport());
  zip.file("blocks-metadata.json", JSON.stringify(currentAnalysis.blocks, null, 2));
  zip.file("proposed-outputs.json", JSON.stringify(currentAnalysis.blocks.filter((block) => block.filename).map((block) => ({
    filename: block.filename,
    tagType: block.tagType,
    outputType: block.outputType,
    destination: block.destination,
    classification: block.classification,
    mediaRefs: block.mediaRefs.map((ref) => ({ tag: ref.tag, filename: ref.filename, status: ref.status, exportPath: ref.matchedFile ? `media/${ref.matchedFile.exportName}` : null }))
  })), null, 2));
  zip.file("scorm-readiness.txt", [
    currentAnalysis.scorm.summary,
    "",
    ...currentAnalysis.scorm.checks.map((item) => `${item.label}: ${item.ok ? "FOUND" : `MISSING - ${item.missing}`}`),
    "",
    `Media ZIP loaded: ${currentMediaZipName || "No"}`,
    `Matched media files: ${matchedMedia.length}`,
    `Missing media refs: ${currentAnalysis.media.missingCount}`,
    `Ambiguous media refs: ${currentAnalysis.media.ambiguousCount}`
  ].join("\n"));
  generatedArtefacts.forEach((file) => zip.file(`generated/${file.filename}`, file.content));
  matchedMedia.forEach((file) => zip.file(`media/${file.exportName}`, file.data));
  const manifest = buildBasicManifest(currentAnalysis, generatedArtefacts);
  if (manifest) zip.file("imsmanifest.xml", manifest);
  triggerDownload(createObjectUrl(await zip.generateAsync({ type: "blob" })), `${baseName(currentSourceFile) || "prototype"}-output-bundle.zip`);
  actionStatus.textContent = manifest ? "Bundle downloaded with media and basic imsmanifest.xml" : "Bundle downloaded";
}

function setActionButtons(enabled) {
  generateBtn.disabled = !enabled;
  summaryBtn.disabled = !enabled;
  bundleBtn.disabled = !enabled;
}

function createDownloadUrl(content, mime) {
  return createObjectUrl(new Blob([content], { type: mime }));
}

function createObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  activeObjectUrls.push(url);
  return url;
}

function downloadTextFile(filename, content) {
  triggerDownload(createDownloadUrl(content, "text/plain;charset=utf-8"), filename);
  actionStatus.textContent = "Summary downloaded";
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function revokeObjectUrls() {
  activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  activeObjectUrls = [];
}

function resetSourceState() {
  currentSourceFile = "";
  currentSourceText = "";
  currentAnalysis = null;
  generatedArtefacts = [];
  blocksCount.textContent = "0 blocks";
  outputsCount.textContent = "0 outputs";
  warningsCount.textContent = "0 warnings";
  scormStatus.textContent = "Not assessed";
  mediaCount.textContent = currentMediaBundle.length ? `${currentMediaBundle.length} files loaded` : "0 references";
  previewBox.className = "empty-state";
  previewBox.textContent = "Upload a tagged .docx to see the extracted document text here.";
  previewStatus.textContent = "Waiting for upload";
  blocksList.className = "empty-state";
  blocksList.textContent = "No blocks yet. Upload a document to detect <HTML>, <worksheet>, and <document> sections.";
  outputsList.className = "empty-state";
  outputsList.textContent = "Proposed outputs will appear here after tags and filenames are detected.";
  scormPanel.className = "empty-state";
  scormPanel.textContent = "Upload a source document to inspect SCORM-related notes and missing decisions.";
  warningsList.className = "empty-state";
  warningsList.textContent = "No warnings yet.";
  actionsPanel.hidden = true;
  generatedPanel.hidden = true;
  generatedList.className = "empty-state";
  generatedList.textContent = "No prototype artefacts generated yet.";
  generatedCount.textContent = "0 files";
  fileMeta.innerHTML = "<span>No source file loaded yet.</span>";
  renderMediaPanel(null);
  setActionButtons(false);
}

function emptyMediaState() {
  return { zipName: currentMediaZipName, loadedFiles: currentMediaBundle.length, references: [], matchedFiles: [], missingCount: 0, ambiguousCount: 0, unusedFiles: currentMediaBundle, warnings: [] };
}

function extractMediaReferences(body) {
  const refs = [];
  let match;
  while ((match = MEDIA_PATTERN.exec(body)) !== null) refs.push({ tag: match[1].toLowerCase(), filename: sanitizeMediaReferenceName(match[2]) });
  MEDIA_PATTERN.lastIndex = 0;
  return refs;
}

function stripMediaTags(body) {
  return body.replace(MEDIA_PATTERN, "").replace(/\n{3,}/g, "\n\n");
}

function deriveDisplayContent(block, filename) {
  const lines = splitBodyLines(block.body);
  const matchedMedia = block.mediaRefs.filter((ref) => ref.status === "matched");
  const missingMedia = block.mediaRefs.filter((ref) => ref.status !== "matched");
  let title = baseName(filename) || filename;
  let subtitle = "";
  let contentLines = [...lines];

  if (lines.length) {
    if (/^worksheet\b/i.test(lines[0]) || /^document\b/i.test(lines[0]) || /^introduction\b/i.test(lines[0])) {
      title = lines[0];
      contentLines = lines.slice(1);
    } else if (lines[0].length <= 70) {
      title = lines[0];
      contentLines = lines.slice(1);
    }
  }

  if (contentLines.length && contentLines[0].length <= 110 && !looksLikeSectionLabel(contentLines[0])) {
    subtitle = contentLines[0];
    contentLines = contentLines.slice(1);
  }

  return { title, subtitle, contentLines, leadMedia: matchedMedia[0] || null, remainingMedia: matchedMedia.slice(1), missingMedia };
}

function renderSingleMediaHtml(ref) {
  if (ref.status !== "matched" || !ref.matchedFile) return `<p style="margin:0;color:#64748b;line-height:1.7;">${escapeHtml(ref.tag)}: ${escapeHtml(ref.filename)} (${escapeHtml(ref.detail)})</p>`;
  const href = `../media/${encodePathSegment(ref.matchedFile.exportName)}`;
  if (ref.tag === "image" && isImageFile(ref.matchedFile.exportName)) return `<strong>Image:</strong> ${escapeHtml(ref.matchedFile.exportName)}<img src="${href}" alt="${escapeHtml(ref.matchedFile.exportName)}" />`;
  if (ref.tag === "video" && isVideoFile(ref.matchedFile.exportName)) return `<strong>Video:</strong> ${escapeHtml(ref.matchedFile.exportName)}<video controls src="${href}"></video>`;
  if (ref.tag === "audio" && isAudioFile(ref.matchedFile.exportName)) return `<strong>Audio:</strong> ${escapeHtml(ref.matchedFile.exportName)}<audio controls src="${href}"></audio>`;
  return `<strong>${escapeHtml(capitalize(ref.tag))}:</strong> <a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(ref.matchedFile.exportName)}</a>`;
}

function renderBodyContentHtml(lines) {
  if (!lines.length) return `<p>(No visible text inside block)</p>`;
  const html = [];
  let listBuffer = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    html.push(`<ul>${listBuffer.map((line) => `<li>${linkifyText(escapeHtml(line))}</li>`).join("")}</ul>`);
    listBuffer = [];
  };

  lines.forEach((line) => {
    if (looksLikeSectionLabel(line)) {
      flushList();
      html.push(`<h2>${escapeHtml(trimTrailingColon(line))}</h2>`);
      return;
    }

    if (looksLikeBullet(line)) {
      listBuffer.push(line.replace(/^[-*•]\s+/, "").trim());
      return;
    }

    flushList();
    html.push(`<p>${linkifyText(escapeHtml(line))}</p>`);
  });

  flushList();
  return html.join("");
}

function splitBodyLines(value) {
  return sanitizeBodyText(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function sanitizeBodyText(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/[“”]/g, "\"").replace(/[‘’]/g, "'").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeFilenameValue(value) {
  const cleaned = String(value || "").replace(/[“”]/g, "").replace(/[‘’]/g, "").replace(/[\u200b-\u200d\uFEFF]/g, "").trim();
  return cleaned.replace(/[<>:"|?*]/g, "").replace(/\s+/g, " ");
}

function sanitizeMediaReferenceName(value) {
  return sanitizeFilenameValue(value).replace(/^\.?[\\/]+/, "");
}

function looksLikeSectionLabel(line) {
  return /^[A-Z][A-Za-z0-9 /&()-]{1,40}:$/.test(line) || /^(over to you|challenges|hints|resources|extensions):?$/i.test(line);
}

function trimTrailingColon(line) {
  return String(line).replace(/:\s*$/, "");
}

function looksLikeBullet(line) {
  return /^[-*•]\s+/.test(line);
}

function linkifyText(html) {
  return html.replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function buildMediaIndex(files) {
  const counts = new Map();
  files.forEach((file) => counts.set(file.key, (counts.get(file.key) || 0) + 1));
  const duplicates = new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  const index = new Map();
  files.forEach((file) => { if (!duplicates.has(file.key)) index.set(file.key, file); });
  return { index, duplicates };
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = `${warning.level}|${warning.title}|${warning.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueMatchedMedia(analysis) {
  const seen = new Set();
  return analysis.media.references.filter((ref) => ref.status === "matched" && ref.matchedFile).map((ref) => ref.matchedFile).filter((file) => {
    if (seen.has(file.key)) return false;
    seen.add(file.key);
    return true;
  });
}

function baseName(filename) { return filename ? filename.replace(/\.[^.]+$/, "") : ""; }
function lineNumberAt(text, index) { return String(text || "").slice(0, index).split("\n").length; }
function basenameOnly(value) { return String(value).split("/").pop().split("\\").pop(); }
function normalizeMediaName(value) { return basenameOnly(value).trim().toLowerCase(); }
function getMimeType(filename) {
  const lower = filename.toLowerCase();
  if (/\.(jpg|jpeg)$/.test(lower)) return "image/jpeg";
  if (/\.png$/.test(lower)) return "image/png";
  if (/\.gif$/.test(lower)) return "image/gif";
  if (/\.svg$/.test(lower)) return "image/svg+xml";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.mp4$/.test(lower)) return "video/mp4";
  if (/\.webm$/.test(lower)) return "video/webm";
  if (/\.mp3$/.test(lower)) return "audio/mpeg";
  if (/\.wav$/.test(lower)) return "audio/wav";
  if (/\.pdf$/.test(lower)) return "application/pdf";
  return "application/octet-stream";
}
function isImageFile(filename) { return /\.(png|jpe?g|gif|svg|webp)$/i.test(filename); }
function isVideoFile(filename) { return /\.(mp4|webm|ogg)$/i.test(filename); }
function isAudioFile(filename) { return /\.(mp3|wav|ogg|m4a)$/i.test(filename); }
function encodePathSegment(value) { return encodeURIComponent(value); }
function capitalize(value) { return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : ""; }
function makeExcerpt(value, maxLength) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}...`;
}
function escapeXml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;"); }
function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }

