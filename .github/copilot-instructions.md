# GitHub Copilot Instructions

Use [AGENTS.md](/AGENTS.md) as the detailed source of truth for repository behavior. These instructions are the short operational summary.

## Priorities

- preserve pedagogical intent
- make minimal diffs
- reuse existing helpers before writing new code
- keep rendering stable
- avoid unnecessary format or workflow changes

## Repository Shape

- `lectures/*.Rmd` are legacy xaringan slides
- `lectures/lecture10.qmd` and `lectures/lecture11.qmd` are Quarto revealjs slides
- `labs/*.Rmd` are lab handouts
- `notes/index.Rmd` is the entrypoint for the bookdown notes
- `common/*.R` contains reusable R helpers
- `lectures/widgets/**` contains reusable JS / OJS widgets

## Rules

- do not convert `.Rmd` to `.qmd` unless explicitly asked
- preserve YAML/front matter, chunk behavior, and render conventions
- prefer shared helpers over inline reimplementation
- keep lecture files focused on explanation and lightweight orchestration
- avoid introducing new frameworks or dependencies without a clear reason

## Validation

Use the smallest relevant validation step:

- `quarto render lectures/lecture10.qmd`
- `quarto render lectures/lecture11.qmd`
- `rmarkdown::render("path/to/file.Rmd")`
- `bookdown::render_book("notes/index.Rmd")`
