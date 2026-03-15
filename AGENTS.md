# AGENTS.md

## Purpose

This repository contains teaching materials for `161.324 Data Mining` at Massey University. It is a mixed-format teaching codebase, not a general application repository.

The active source formats in this repo are:

- xaringan lecture slides in `lectures/*.Rmd`
- Quarto revealjs lecture slides in `lectures/*.qmd`
- lab handouts in `labs/*.Rmd`
- bookdown notes rooted at `notes/index.Rmd`
- reusable R helpers in `common/*.R`
- reusable JavaScript / OJS widgets in `lectures/widgets/**`

Agents must optimize for:

1. pedagogical clarity
2. reproducibility
3. minimal, reviewable diffs
4. rendering stability
5. reuse of existing helpers before new implementation

Preserve instructional intent unless the user explicitly asks to revise it.

## Working Rules

- Keep changes narrowly scoped.
- Preserve YAML/front matter, chunk labels, cross references, and existing rendering conventions unless a change is required.
- Do not convert `.Rmd` files to `.qmd` unless explicitly asked.
- Do not replace existing workflows, package ecosystems, or repo structure unless explicitly asked.
- Do not rewrite working code for style alone.
- Do not fabricate datasets, helper functions, or outputs.
- Prefer relative paths and existing asset locations.

## Reuse First

Before writing new logic:

- search for an existing helper in `common/*.R`
- search for an existing widget or OJS helper in `lectures/widgets/**`
- extend an existing helper when that is simpler than introducing a new one

Keep lecture documents focused on teaching narrative and lightweight orchestration. If JS/OJS logic is more than a small lecture-local snippet, move it into a shared widget module.

## Format-Specific Conventions

### Legacy Lecture Slides

- `lectures/*.Rmd` primarily render with `xaringan::moon_reader`
- preserve slide separators, `class:` markers, and custom CSS usage such as `lectures/custom.css`

### Quarto Lecture Slides

- `lectures/*.qmd` render with Quarto revealjs
- preserve `resources:`, OJS imports, revealjs settings, and theme references such as lecture-local `.scss` files and `custom_quarto.css`
- keep reusable widget logic in `lectures/widgets/**`, not inline in the lecture when reuse is plausible

### Labs

- `labs/*.Rmd` render as `html_document`
- preserve lab prose, runnable code chunks, and package choices unless a task requires change
- Duplicating small setup/helper code across labs is expected as student usability is more important here than reuse

### Notes

- notes are a bookdown project rooted at `notes/index.Rmd`
- follow `notes/_bookdown.yml` and `notes/_output.yml`
- preserve cross-chapter structure, CSS, and TeX support files

## Rendering And Validation

Validate the smallest relevant target after edits.

- Quarto lectures: `quarto render path/to/file.qmd`
- Labs and legacy lecture `.Rmd`: `rmarkdown::render("path/to/file.Rmd")`
- Notes: `bookdown::render_book("notes/index.Rmd")`

If local rendering is risky or unavailable, make conservative changes and avoid structural rewrites.

When a change affects computed results, figures, simulations, clustering output, association rules, or interpretation text, keep the narrative aligned with the new output.

## Safe Changes

Usually safe:

- typo fixes
- explanation clarifications
- broken relative path fixes
- small rendering fixes
- extracting duplicated widget logic into `lectures/widgets/**`
- replacing duplicated code with imports from existing helpers

Require explicit approval:

- `.Rmd` to `.qmd` migration
- repo-wide output regeneration
- major theme or CSS redesign
- new JS framework or bundler
- large-scale pedagogical rewrites
- structural reorganization beyond the target task

## Git Hygiene

- avoid unrelated file edits
- preserve existing line endings and encoding
- avoid formatting-only churn
- keep diffs easy for an instructor to review

## Bottom Line

Treat this repo as a teaching codebase where correctness, maintainability, reuse, and instructional intent matter more than novelty. Prefer importing existing helpers from `common/*.R` and `lectures/widgets/**` over rebuilding logic from first principles.
