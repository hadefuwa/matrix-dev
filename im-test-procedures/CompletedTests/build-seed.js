// Builds seed-reports.json from the three completed IM6930 production tests.
// Step list comes from PROCEDURES in ../index.html; all steps recorded as PASS.
// Operator/sign-off per PDF; date is the PDF print date (PDFs carry no test date).
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const start = html.indexOf("const PROCEDURES = ");
const end = html.indexOf("\n};", start) + 3;
const PROCEDURES = new Function(html.slice(start, end).replace("const PROCEDURES = ", "return ") )();
const proc = PROCEDURES.im6930 || Object.values(PROCEDURES).find(p => p.code === "IM6930");

const DATE = "2026-03-20";
const tests = [
  { serial: "SN-0001", operator: "Goshia Pomocka", initials: "MP", comments: "Must be fitted to backplate" },
  { serial: "SN-0002", operator: "Marcin Borski", initials: "MB", comments: "Accepted, awaiting Backplate Fix" },
  { serial: "SN-0003", operator: "Paul Womersley", initials: "PW", comments: "Back plate needs to be fitted." },
];

const reports = tests.map((t, i) => {
  const sections = {};
  let total = 0;
  proc.sections.forEach(sec => {
    sections[sec.title] = sec.steps.map(s => {
      total++;
      return { step: s.id, criteria: s.criteria, result: "PASS", comments: "", signOff: t.initials };
    });
  });
  return {
    reportId: `IM-6930-${t.serial}`,
    date: DATE,
    submittedAt: `${DATE}T12:0${i}:00.000Z`,
    operator: t.operator,
    product: proc.productName,
    serialNumber: t.serial,
    buildReference: "",
    procedure: "IM6930",
    overallResult: "PASS",
    totalSteps: total,
    stepsPassed: total,
    stepsFailed: 0,
    comments: t.comments,
    sections,
  };
});

fs.writeFileSync(path.join(__dirname, "seed-reports.json"), JSON.stringify(reports, null, 2));
console.log(reports.map(r => `${r.reportId}: ${r.totalSteps} steps`).join("\n"));
