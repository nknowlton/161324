# 161.324 Data Mining

This repository contains the source files for teaching materials used in `161.324 Data Mining` at Massey University. It is organised around the authoring formats used for lectures, labs, notes, and reusable teaching assets.

## Source formats

- Legacy lecture slides are written in `.Rmd` and primarily render with `xaringan`.
- Quarto lecture slides are written in `.qmd` and render with `revealjs`.
- Labs are written in `.Rmd` and render as `html_document`.
- Notes are written in `.Rmd` and build as a `bookdown` project rooted at `notes/index.Rmd`.

## Repository layout

- `lectures/` contains slide decks, lecture themes, supporting assets, and reusable widgets.
- `labs/` contains lab handouts and companion guide versions.
- `notes/` contains the bookdown notes project and its supporting files.
- `common/` contains reusable R helpers shared across materials.
- `lectures/widgets/` contains reusable JavaScript and OJS widgets for interactive lecture content.

## Rendering

Render the smallest relevant target after making changes:

- Quarto slides: `quarto render path/to/file.qmd`
- R Markdown slides or labs: `rmarkdown::render("path/to/file.Rmd")`
- Notes: `bookdown::render_book("notes/index.Rmd")`

## Editing conventions

- Preserve the existing format and rendering workflow for each document.
- Keep changes narrow, reviewable, and focused on the target material.
- Reuse helpers from `common/` and `lectures/widgets/` before adding new logic.
- Avoid `.Rmd` to `.qmd` migrations unless the change is intentional and explicitly planned.
