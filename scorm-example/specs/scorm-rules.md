```markdown
# SCORM Rules

## Purpose

These rules define how SCORM output should be treated.

## Important principle

The source document may describe a SCORM course, but that does not mean the source document is itself SCORM compliant.

SCORM output must only be produced when enough explicit information exists.

## Minimum SCORM expectations

A valid SCORM package must include:
- a valid `imsmanifest.xml`
- a defined organisation structure
- resource declarations
- launchable learner content
- valid resource paths
- packaged assets in a ZIP for LMS upload

## AI agent constraints

The AI agent must not invent:
- SCORM version
- sequencing behaviour
- completion logic
- progress logic
- mastery score
- suspend/resume behaviour
- launch file names
- metadata values

unless these are explicitly provided or requested.

## Acceptable agent actions

The AI agent may:
- build a SCORM folder skeleton
- draft a manifest template
- populate manifest entries from explicit screen definitions
- generate a warning list for missing SCORM decisions
- identify which assets are launchable and which are not

## Required SCORM decision list

Before final packaging, the following must be confirmed:

1. SCORM version
   - SCORM 1.2 or SCORM 2004

2. Launch structure
   - single SCO
   - multiple SCOs
   - asset-only pages

3. Completion model
   - completion by launch
   - completion by page views
   - completion by quiz or assessment
   - manual completion

4. Tracking model
   - bookmark only
   - progress measure
   - completion status
   - score reporting

5. Navigation model
   - free navigation
   - linear navigation
   - locked progression

## Output requirements

If SCORM generation is attempted, produce:
- `imsmanifest.xml`
- launch file or files
- referenced assets
- validation report
- packaging report

## Stop conditions

The AI agent must stop final SCORM packaging and report issues if:
- manifest-critical information is missing
- launch files are undefined
- required resources do not exist
- referenced files cannot be resolved
- completion or sequencing rules are too ambiguous for safe implementation
```