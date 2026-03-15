resolve_data_dir <- function(input_dir = ".") {
  data_dir <- normalizePath(
    file.path(input_dir, "..", "data"),
    winslash = "/",
    mustWork = FALSE
  )
  dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)
  data_dir
}

tidytuesday_read_csv <- function(path_or_url) {
  readr::read_csv(path_or_url, show_col_types = FALSE)
}

read_tidytuesday_cached <- function(url, backup_file, data_dir, csv_file = NULL) {
  data_dir <- normalizePath(data_dir, winslash = "/", mustWork = FALSE)
  dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)

  backup_path <- file.path(data_dir, backup_file)
  csv_path <- if (is.null(csv_file)) sub("\\.parquet$", ".csv", backup_path) else file.path(data_dir, csv_file)

  online <- tryCatch(
    tidytuesday_read_csv(url),
    error = function(e) NULL
  )

  if (!is.null(online)) {
    if (requireNamespace("arrow", quietly = TRUE)) {
      arrow::write_parquet(online, backup_path)
    }
    return(tibble::as_tibble(online))
  }

  if (file.exists(backup_path)) {
    if (!requireNamespace("arrow", quietly = TRUE)) {
      stop("Package 'arrow' is required to read the cached parquet file at ", backup_path, call. = FALSE)
    }
    return(arrow::read_parquet(backup_path) |> tibble::as_tibble())
  }

  if (file.exists(csv_path)) {
    return(tidytuesday_read_csv(csv_path) |> tibble::as_tibble())
  }

  stop(
    "Could not download ", url,
    " and no local backup was found at ", backup_path,
    " or ", csv_path,
    call. = FALSE
  )
}

write_tidytuesday_parquet <- function(data, backup_file, data_dir) {
  if (!requireNamespace("arrow", quietly = TRUE)) {
    stop("Package 'arrow' is required to write parquet backups.", call. = FALSE)
  }

  data_dir <- normalizePath(data_dir, winslash = "/", mustWork = FALSE)
  dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)
  backup_path <- file.path(data_dir, backup_file)
  arrow::write_parquet(data, backup_path)
  backup_path
}

cache_tidytuesday_parquet <- function(url, backup_file, data_dir, csv_file = NULL) {
  data_dir <- normalizePath(data_dir, winslash = "/", mustWork = FALSE)
  dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)

  csv_path <- if (is.null(csv_file)) NULL else file.path(data_dir, csv_file)
  data <- if (!is.null(csv_path) && file.exists(csv_path)) {
    tidytuesday_read_csv(csv_path)
  } else {
    tidytuesday_read_csv(url)
  }

  write_tidytuesday_parquet(data, backup_file, data_dir)
  tibble::as_tibble(data)
}
