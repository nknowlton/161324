project_root <- local({
  file_arg <- commandArgs(trailingOnly = FALSE)
  file_arg <- file_arg[grepl("^--file=", file_arg)]
  if (length(file_arg) == 0) {
    normalizePath(file.path("..", ".."), winslash = "/", mustWork = FALSE)
  } else {
    script_path <- normalizePath(sub("^--file=", "", file_arg[[1]]), winslash = "/", mustWork = TRUE)
    normalizePath(file.path(dirname(script_path), "..", ".."), winslash = "/", mustWork = TRUE)
  }
})

project_lib <- normalizePath(file.path(project_root, ".Rlib"), winslash = "/", mustWork = FALSE)
dir.create(project_lib, recursive = TRUE, showWarnings = FALSE)
.libPaths(c(project_lib, .libPaths()))

suppressPackageStartupMessages({
  library(dplyr)
  library(ggplot2)
  library(readr)
  library(tibble)
  library(tidymodels)
  library(baguette)
  library(ranger)
  library(xgboost)
})

source(file.path(project_root, "common", "longbeach.R"))

artifact_dir <- file.path(project_root, "notes", "artifacts")
artifact_path <- file.path(artifact_dir, "longbeach-ensemble-results.rds")
dir.create(artifact_dir, recursive = TRUE, showWarnings = FALSE)

longbeach <- read_csv(file.path(project_root, "data", "longbeach.csv"), show_col_types = FALSE)
adoption_data <- prepare_longbeach_adoption_data(longbeach)

set.seed(2024)
adopt_split <- initial_split(adoption_data, prop = 0.75, strata = is_adopted)
adopt_train <- training(adopt_split)
adopt_test <- testing(adopt_split)
adopt_folds <- vfold_cv(adopt_train, v = 5, strata = is_adopted)

adopt_recipe <- recipe(is_adopted ~ ., data = adopt_train) |>
  step_novel(all_nominal_predictors()) |>
  step_unknown(all_nominal_predictors(), new_level = "missing") |>
  step_dummy(all_nominal_predictors())

wf <- workflow() |> add_recipe(adopt_recipe)

single_tree_spec <- decision_tree(mode = "classification") |>
  set_engine("rpart")

bag_spec <- bag_tree(mode = "classification") |>
  set_engine("rpart", times = 10)

single_tree_res <- wf |>
  add_model(single_tree_spec) |>
  fit_resamples(adopt_folds, metrics = metric_set(accuracy))

bag_res <- wf |>
  add_model(bag_spec) |>
  fit_resamples(adopt_folds, metrics = metric_set(accuracy))

bag_metrics <- bind_rows(
  collect_metrics(single_tree_res) |> mutate(model = "single tree"),
  collect_metrics(bag_res) |> mutate(model = "bagged trees")
) |>
  select(model, .metric, mean, std_err)

rf_spec <- rand_forest(mode = "classification", trees = 500, mtry = tune()) |>
  set_engine("ranger", importance = "impurity")

rf_wf <- wf |> add_model(rf_spec)
rf_grid <- tibble(mtry = c(2L, 4L, 6L))
rf_tune <- tune_grid(
  rf_wf,
  resamples = adopt_folds,
  grid = rf_grid,
  metrics = metric_set(roc_auc)
)
rf_best <- show_best(rf_tune, metric = "roc_auc")
best_mtry <- select_best(rf_tune, metric = "roc_auc")
final_rf <- finalize_workflow(rf_wf, best_mtry) |> fit(adopt_train)
rf_importance <- final_rf |>
  extract_fit_engine() |>
  (\(m) tibble(variable = names(m$variable.importance),
               importance = unname(m$variable.importance)))() |>
  arrange(desc(importance))

boost_spec <- boost_tree(
  mode = "classification",
  trees = tune(),
  tree_depth = tune(),
  learn_rate = tune()
) |>
  set_engine("xgboost")

boost_wf <- wf |> add_model(boost_spec)
boost_grid <- grid_regular(
  trees(range = c(50L, 300L)),
  tree_depth(range = c(2L, 5L)),
  learn_rate(range = c(-2, -0.5), trans = scales::log10_trans()),
  levels = 3
)

boost_tune <- tune_grid(
  boost_wf,
  resamples = adopt_folds,
  grid = boost_grid,
  metrics = metric_set(roc_auc)
)

boost_best <- show_best(boost_tune, metric = "roc_auc", n = 5)
best_boost <- select_best(boost_tune, metric = "roc_auc")
final_boost <- finalize_workflow(boost_wf, best_boost) |>
  last_fit(adopt_split, metrics = metric_set(accuracy, roc_auc))
boost_final_metrics <- collect_metrics(final_boost)

stacking_info <- list(
  available = FALSE,
  note = "Install the `stacks` package and extend this helper if you want an offline stacking artifact for the notes."
)

artifact <- list(
  meta = list(
    generated_at = format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"),
    seed = 2024L,
    train_rows = nrow(adopt_train),
    test_rows = nrow(adopt_test)
  ),
  bag_metrics = bag_metrics,
  rf_best = rf_best,
  rf_importance = rf_importance,
  boost_best = boost_best,
  boost_final_metrics = boost_final_metrics,
  stacking = stacking_info
)

saveRDS(artifact, artifact_path)
cat("Wrote ensemble artifact to", normalizePath(artifact_path, winslash = "/", mustWork = FALSE), "\n")
