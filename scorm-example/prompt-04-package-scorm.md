Read:
- `agents.md`
- all files in `specs/`
- `reports/analysis-report.md`
- `reports/extraction-report.md`
- `reports/build-report.md`
- `reports/validation-report.md`

You are now working on SCORM packaging only.

Treat SCORM carefully. The source document may contain SCORM planning notes, but that does not mean the course is ready for full SCORM packaging.

## Objective

Attempt to build a SCORM package only from explicit and safely supported information.

## Tasks

1. Review all prior reports before starting.
2. Identify all SCORM-related source sections and determine whether they are:
   - implementation-ready
   - partial specification
   - placeholder/planning notes
3. Determine whether enough information exists to package SCORM safely.
4. If enough information exists, build a SCORM package structure inside:
   - `outputs/scorm/`
5. If enough information does not exist, stop final packaging and produce a clear report of what is missing.

## Minimum SCORM expectations

Do not treat the package as valid unless you can define:
- a valid `imsmanifest.xml`
- launchable content
- resource references
- organisation structure
- package file structure

## Constraints

Do not invent unless explicitly instructed:
- SCORM version
- sequencing behaviour
- completion logic
- tracking/progress behaviour
- launch structure
- metadata values
- mastery or scoring rules

## Acceptable outputs in this stage

If information is incomplete, you may still create:
- a SCORM folder skeleton
- a draft manifest template
- a list of required missing decisions
- a packaging readiness assessment

## Stop conditions

Stop final SCORM packaging and report issues if:
- manifest-critical information is missing
- no clear launch file exists
- resource links cannot be resolved
- required source files are missing
- sequencing/completion logic is too ambiguous
- browser content is not sufficiently assembled to support packaging

## Deliverables

Create or update:
- `outputs/scorm/`
- `reports/packaging-report.md`
- update `reports/validation-report.md` if needed with SCORM-specific findings

## Packaging report must include

### Summary
State one of:
- SCORM package created
- SCORM skeleton created only
- SCORM packaging stopped due to missing information

### SCORM readiness assessment
Explain whether the project is:
- ready
- partially ready
- not ready

### Decisions confirmed
List any SCORM decisions that were explicit in the source.

### Decisions missing
List anything still needed, such as:
- SCORM 1.2 or 2004
- launch file
- single SCO or multiple SCOs
- completion model
- tracking model
- navigation model

### Files generated
A table containing:
- filename
- purpose
- status
- notes

### Warnings
Ambiguities, assumptions avoided, unsupported file references.

### Errors
Anything that prevented safe packaging.

## Important rules

- Do not claim SCORM compliance unless the package is actually valid and complete.
- Do not hide missing information.
- Prefer a clear "not ready yet" result over a guessed package.