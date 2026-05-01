# SCORM Source Authoring Guide

Use this guide when writing the source Word document for the course-build pipeline.

The goal is to create a source file that:

- extracts cleanly
- builds clean outputs
- keeps learner-facing content separate from support files
- can be packaged into a SCORM resource pack without guessing missing rules

## Core authoring rules

### 1. Use one tagged block for each output file

Every publishable item must sit inside its own recognised block.

Recognised block types:

- `<HTML> ... </HTML>` for learner-facing web pages
- `<worksheet> ... </worksheet>` for printable worksheet outputs
- `<document> ... </document>` for reference or supporting documents

Do not combine multiple learner outputs into one block.

## 2. Add a filename inside every publishable block

Each block must contain a filename line in this exact pattern:

`<filename>"CP4807-H1.html"</filename>`

Rules:

- use double quotes
- include a file extension
- keep filenames unique across the whole source document
- match the extension to the block type

Recommended extensions:

- `<HTML>` -> `.html`
- `<worksheet>` -> `.docx`
- `<document>` -> `.pdf`, `.docx`, or the intended reference format

## 3. Match opening and closing tags exactly

Tags are case-sensitive.

Correct:

`<HTML> ... </HTML>`

Incorrect:

`<HTML> ... </html>`

## 4. Keep learner content clean

Inside publishable blocks, include only content that should appear in the final learner resource.

Keep these outside publishable blocks unless they are intentionally learner-facing:

- author reminders
- teacher-only notes
- build instructions
- drafting comments
- planning text

## 5. Use HTML blocks for trackable SCORM learner pages

If a page might need to be launched or tracked by the LMS, write it as an `<HTML>` block.

Best practice:

- one assessment per HTML block
- one homework per HTML block
- one quiz or scored task per HTML block
- clear learner title near the top of the block

This gives the packaging step a clean candidate for the launch file and any SCO items.

## 6. Keep support files separate from tracked content

Use:

- `<worksheet>` for printable activities that are not expected to be tracked as SCOs
- `<document>` for certificates, handouts, or supporting references

Do not expect worksheet or document blocks to become trackable SCORM items unless they are rebuilt as launchable HTML pages.

## 7. Define the five SCORM decisions explicitly

For the best SCORM-compliant resource pack, the source or a companion specification file must define all five of these:

1. `scorm-version: "1.2"` by default, or `scorm-version: "2004"` only if the LMS requires it
2. `launch: "CP4807-A1.html"`
3. `tracking: "completion-only"`, `score-only`, or `completion-and-score`
4. `completion: "page-view"`, `quiz-pass`, `time-based`, or another explicit model
5. `navigation: "free"` or `"linear"`

Important:

- the launch file must be a real generated HTML output
- use SCORM 1.2 as the default unless you have a confirmed LMS reason to use 2004
- none of these values should be guessed during packaging
- if even one is missing, SCORM packaging should stop

## 8. Add external resources in a structured way

This workflow can include external links such as YouTube videos, datasheets, Google Docs, and Google Slides, but the links need to be authored clearly.

Recommended pattern inside a learner-facing block:

- `Video resource: https://youtu.be/...`
- `Datasheet: PIC16F877A datasheet - https://...`
- `Learner slides: https://docs.google.com/presentation/d/.../view`

Rules:

- put the link inside the block where the learner needs it
- name the resource in plain English
- use stable share or view URLs
- do not paste temporary browser addresses or search pages
- if the resource is essential, mention its purpose in the learner instructions

## 9. Keep teacher links separate from learner links

Teacher materials can be part of the overall resource pack, but they should not be mixed into learner HTML unless they are intended for learners.

Examples of teacher-only resources:

- teacher PowerPoint links
- editable Google Slides
- editable Google Docs
- answer sheets
- delivery notes

Best practice:

- place teacher-only links in a separate `<document>` block
- or create a dedicated teacher resource output
- keep learner-visible links inside learner-facing `<HTML>` blocks

Example:

```text
<HTML>
Worksheet 3: Inputs and outputs
<filename>"CP4807-WS3.html"</filename>

Complete the worksheet tasks below.
Video resource: https://youtu.be/h8-7BsXBpLc
Datasheet: PIC16F877A datasheet - https://www.example.com/pic16f877a.pdf
Learner slides: https://docs.google.com/presentation/d/example/view

</HTML>

<document>
Teacher delivery pack
<filename>"CP4807-Teacher-Pack.docx"</filename>

Teacher slides: https://docs.google.com/presentation/d/example/edit
Teacher notes: https://docs.google.com/document/d/example/edit

</document>
```

## Recommended source pattern

```text
<HTML>
Assessment 1: Traffic light logic
<filename>"CP4807-A1.html"</filename>

Create a program that controls two sets of traffic lights at a junction.
Your solution must include:
- red, amber, and green timing
- a safe transition sequence
- a short explanation of your logic

</HTML>

scorm-version: "1.2"
launch: "CP4807-A1.html"
tracking: "completion-and-score"
completion: "quiz-pass"
navigation: "linear"
```

## Quick checklist before export

Before running the pipeline, confirm:

- every publishable block has a recognised tag
- every publishable block has a `<filename>` line
- every filename is unique
- every closing tag matches exactly
- every trackable learner page is an HTML block
- support files are separated from learner pages
- all five SCORM decisions are defined explicitly

If those checks pass, the source is in a much stronger position to produce a clean SCORM-ready resource pack.
