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
  library(jsonlite)
})

source(file.path(project_root, "common", "tidytuesday.R"))
source(file.path(project_root, "common", "longbeach.R"))

if (!requireNamespace("h2o", quietly = TRUE)) {
  stop("Package 'h2o' is required to prepare the offline AutoML artifact.", call. = FALSE)
}

java_path <- Sys.which("java")
if (nzchar(java_path)) {
  java_home <- normalizePath(file.path(dirname(java_path), ".."), winslash = "/", mustWork = TRUE)
  Sys.setenv(JAVA_HOME = java_home)
}

longbeach_url <- "https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2025/2025-03-04/longbeach.csv"
data_dir <- normalizePath(file.path(project_root, "data"), winslash = "/", mustWork = FALSE)
artifact_path <- normalizePath(
  file.path(project_root, "lectures", "widgets", "ensembles", "data", "longbeach-automl.json"),
  winslash = "/",
  mustWork = FALSE
)

to_threshold_curve <- function(prob, truth, thresholds = seq(0.1, 0.9, by = 0.05)) {
  positive <- truth == "Adopted"

  dplyr::bind_rows(lapply(thresholds, function(threshold) {
    pred <- prob >= threshold
    tp <- sum(pred & positive)
    fp <- sum(pred & !positive)
    tn <- sum(!pred & !positive)
    fn <- sum(!pred & positive)

    tibble::tibble(
      threshold = threshold,
      accuracy = (tp + tn) / length(truth),
      precision = if ((tp + fp) == 0) 0 else tp / (tp + fp),
      recall = if ((tp + fn) == 0) 0 else tp / (tp + fn),
      f1 = if ((2 * tp + fp + fn) == 0) 0 else (2 * tp) / (2 * tp + fp + fn)
    )
  }))
}

algorithm_family <- function(model_id) {
  dplyr::case_when(
    grepl("^StackedEnsemble", model_id) ~ "Stacked Ensemble",
    grepl("^XGBoost", model_id) ~ "XGBoost",
    grepl("^GBM", model_id) ~ "GBM",
    grepl("^DRF", model_id) ~ "Random Forest",
    grepl("^GLM", model_id) ~ "GLM",
    grepl("^DeepLearning", model_id) ~ "Deep Learning",
    TRUE ~ "Other"
  )
}

stratified_split <- function(data, prop = 0.8, seed = 161324) {
  set.seed(seed)
  row_groups <- split(seq_len(nrow(data)), data$is_adopted)

  keep_rows <- row_groups |>
    lapply(function(group_data) {
      n_group <- length(group_data)
      n_keep <- if (n_group <= 1) {
        n_group
      } else {
        min(max(1L, ceiling(prop * n_group)), n_group - 1L)
      }

      sample(group_data, size = n_keep)
    }) |>
    unlist(use.names = FALSE)

  data |>
    dplyr::mutate(.train = seq_len(nrow(data)) %in% keep_rows)
}

longbeach <- read_tidytuesday_cached(
  longbeach_url,
  backup_file = "longbeach.parquet",
  data_dir = data_dir,
  csv_file = "longbeach.csv"
)

invisible(write_tidytuesday_parquet(longbeach, "longbeach.parquet", data_dir))

model_data <- prepare_longbeach_adoption_data(longbeach)
split_data <- stratified_split(model_data)
train_data <- split_data |> filter(.train) |> select(-.train)
test_data <- split_data |> filter(!.train) |> select(-.train)

h2o::h2o.init(nthreads = -1, max_mem_size = "2G", startH2O = TRUE)
on.exit(try(h2o::h2o.shutdown(prompt = FALSE), silent = TRUE), add = TRUE)

train_h2o <- h2o::as.h2o(train_data)
test_h2o <- h2o::as.h2o(test_data)
y <- "is_adopted"
x <- setdiff(names(train_data), y)

seed <- 161324
runtime_seconds <- 60L

aml <- h2o::h2o.automl(
  x = x,
  y = y,
  training_frame = train_h2o,
  leaderboard_frame = test_h2o,
  max_runtime_secs = runtime_seconds,
  sort_metric = "AUC",
  seed = seed
)

leaderboard_raw <- as.data.frame(h2o::h2o.get_leaderboard(aml, extra_columns = "ALL"))

leaderboard <- dplyr::bind_rows(lapply(seq_len(nrow(leaderboard_raw)), function(index) {
  model_id <- leaderboard_raw$model_id[[index]]
  model <- h2o::h2o.getModel(model_id)
  perf <- h2o::h2o.performance(model, newdata = test_h2o)
  acc_tbl <- as.data.frame(h2o::h2o.accuracy(perf))
  best_acc <- if (nrow(acc_tbl) == 0) {
    tibble::tibble(threshold = 0.5, accuracy = NA_real_)
  } else {
    acc_tbl[which.max(acc_tbl$accuracy), ]
  }

  tibble::tibble(
    rank = index,
    model_id = model_id,
    algorithm = algorithm_family(model_id),
    auc = as.numeric(h2o::h2o.auc(perf)),
    aucpr = as.numeric(h2o::h2o.aucpr(perf)),
    logloss = as.numeric(h2o::h2o.logloss(perf)),
    accuracy = best_acc$accuracy[[1]],
    best_threshold = best_acc$threshold[[1]]
  )
}))

leader_id <- leaderboard$model_id[[1]]
leader_model <- h2o::h2o.getModel(leader_id)
leader_perf <- h2o::h2o.performance(leader_model, newdata = test_h2o)
leader_pred <- as.data.frame(h2o::h2o.predict(leader_model, test_h2o))
leader_threshold_curve <- to_threshold_curve(leader_pred$Adopted, truth = test_data$is_adopted)
best_leader_threshold <- leader_threshold_curve |> slice_max(accuracy, n = 1)
leader_class <- ifelse(leader_pred$Adopted >= best_leader_threshold$threshold[[1]], "Adopted", "Other")

confusion_table <- table(
  actual = test_data$is_adopted,
  predicted = factor(leader_class, levels = c("Other", "Adopted"))
)
confusion_counts <- tibble::tibble(
  actual = rownames(confusion_table),
  Other = unname(confusion_table[, "Other"]),
  Adopted = unname(confusion_table[, "Adopted"])
)

artifact <- list(
  meta = list(
    dataset = "Long Beach Animal Shelter (TidyTuesday 2025-03-04)",
    target = "is_adopted",
    positive_class = "Adopted",
    generated_at = format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"),
    seed = seed,
    max_runtime_secs = runtime_seconds,
    train_rows = nrow(train_data),
    test_rows = nrow(test_data),
    predictors = x
  ),
  leaderboard = leaderboard |> mutate(across(where(is.numeric), ~ round(.x, 4))),
  leader = list(
    model_id = leader_id,
    algorithm = algorithm_family(leader_id),
    auc = round(as.numeric(h2o::h2o.auc(leader_perf)), 4),
    aucpr = round(as.numeric(h2o::h2o.aucpr(leader_perf)), 4),
    logloss = round(as.numeric(h2o::h2o.logloss(leader_perf)), 4),
    best_accuracy = round(best_leader_threshold$accuracy[[1]], 4),
    best_threshold = round(best_leader_threshold$threshold[[1]], 4),
    confusion = as.data.frame(confusion_counts)
  ),
  threshold_curve = leader_threshold_curve |> mutate(across(where(is.numeric), ~ round(.x, 4))),
  stacked_ensemble = list(
    present = any(grepl("^StackedEnsemble", leaderboard$model_id)),
    best_model_id = dplyr::first(leaderboard$model_id[grepl("^StackedEnsemble", leaderboard$model_id)])
  )
)

dir.create(dirname(artifact_path), recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(artifact, artifact_path, auto_unbox = TRUE, pretty = TRUE, digits = 8)

message("Wrote AutoML artifact to ", artifact_path)
