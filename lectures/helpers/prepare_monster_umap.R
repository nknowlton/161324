`%||%` <- function(x, y) {
  if (is.null(x)) y else x
}

script_arg <- grep("^--file=", commandArgs(), value = TRUE)
script_path <- if (length(script_arg) > 0) {
  normalizePath(sub("^--file=", "", script_arg[[1]]), winslash = "/", mustWork = FALSE)
} else {
  normalizePath(file.path("lectures", "helpers", "prepare_monster_umap.R"), winslash = "/", mustWork = FALSE)
}
project_root <- normalizePath(file.path(dirname(script_path), "..", ".."), winslash = "/", mustWork = FALSE)
project_lib <- normalizePath(file.path(project_root, ".Rlib"), winslash = "/", mustWork = FALSE)
dir.create(project_lib, recursive = TRUE, showWarnings = FALSE)
.libPaths(c(project_lib, .libPaths()))

suppressPackageStartupMessages(suppressWarnings(library(tidyverse)))

if (!requireNamespace("uwot", quietly = TRUE)) {
  stop("The 'uwot' package is required to prepare the offline UMAP artifact.")
}

source(file.path(project_root, "common", "tidytuesday.R"))

data_dir <- resolve_data_dir(file.path(project_root, "lectures"))
output_dir <- normalizePath(
  file.path(project_root, "lectures", "widgets", "clustering", "data"),
  winslash = "/",
  mustWork = FALSE
)
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)
output_file <- file.path(output_dir, "monster-umap.csv")

monster_url <- "https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2025/2025-05-27/monsters.csv"
numeric_cols <- c("str", "dex", "con", "int", "wis", "cha", "hp_number", "cr", "speed_base_number")

monsters <- read_tidytuesday_cached(
  url = monster_url,
  backup_file = "monsters.parquet",
  data_dir = data_dir,
  csv_file = "monsters.csv"
)

monster_scaled <- monsters |>
  mutate(across(all_of(numeric_cols), scale)) |>
  mutate(across(all_of(numeric_cols), as.numeric))

set.seed(161324)

# `init = "random"` keeps the offline prep stable here and avoids the
# spectral-initialisation path that was crashing this Windows toolchain.
monster_umap <- uwot::umap(
  monster_scaled |> select(all_of(numeric_cols)),
  n_neighbors = 15,
  min_dist = 0.15,
  metric = "euclidean",
  init = "random",
  verbose = FALSE
)

artifact <- monsters |>
  transmute(
    id = row_number(),
    name,
    type,
    umap1 = monster_umap[, 1],
    umap2 = monster_umap[, 2]
  )

write_csv(artifact, output_file)
cat("Wrote offline UMAP artifact to", normalizePath(output_file, winslash = "/", mustWork = FALSE), "\n")
