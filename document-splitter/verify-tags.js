"use strict";
const fs   = require("fs");
const path = require("path");
const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");

const OUT_DIR = path.join(__dirname, "outputs", "docx");

function getByLocal(node, name) {
  const r = [];
  function walk(n) {
    if (n.nodeType === 1 && n.localName === name) r.push(n);
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  }
  walk(node);
  return r;
}

const TAG_RE = /<\/?(?:HTML|worksheet|document)\s*>|<filename>|<\/filename>|<image>|<\/image>/i;

async function checkFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return;

  const doc  = new DOMParser({ onError: () => {} }).parseFromString(docXml, "application/xml");
  const body = getByLocal(doc, "body")[0];

  const paras = getByLocal(body, "p");
  const violations = [];
  for (const para of paras) {
    const text = getByLocal(para, "t").map(t => t.textContent || "").join("");
    if (TAG_RE.test(text)) violations.push(JSON.stringify(text.trim().slice(0, 80)));
  }
  const name = path.basename(filePath);
  if (violations.length) {
    console.log("FAIL " + name + ":");
    violations.forEach(v => console.log("  " + v));
  } else {
    console.log("OK   " + name);
  }
}

async function main() {
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".docx"));
  for (const f of files) await checkFile(path.join(OUT_DIR, f));
}
main().catch(console.error);
