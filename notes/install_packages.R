# Install all packages required for the 161.324 Data Mining notes
# Run this once before rendering the bookdown notes.

# Use Posit Package Manager on supported Ubuntu releases when the default
# CRAN mirror has not been customized. This keeps CI and local Linux installs
# aligned while avoiding unnecessary source builds.
current_cran_repo <- unname(getOption("repos")["CRAN"])
default_like_repo <- is.na(current_cran_repo) ||
  current_cran_repo %in% c("@CRAN@", "https://cloud.r-project.org", "https://cran.r-project.org")

if (default_like_repo) {
  if (Sys.info()[["sysname"]] == "Linux") {
    ubuntu_codename <- tryCatch(system("lsb_release -cs", intern = TRUE), error = function(e) character())
    if (length(ubuntu_codename) == 1 && ubuntu_codename %in% c("focal", "jammy", "noble")) {
      options(
        repos = c(
          CRAN = sprintf(
            "https://packagemanager.posit.co/cran/__linux__/%s/latest",
            ubuntu_codename
          )
        )
      )
    } else {
      options(repos = c(CRAN = "https://cloud.r-project.org"))
    }
  } else {
    options(repos = c(CRAN = "https://cloud.r-project.org"))
  }
}

# Use a user library automatically when the default site library is not writable.
if (file.access(.libPaths()[1], 2) != 0) {
  user_lib <- Sys.getenv("R_LIBS_USER")
  if (!nzchar(user_lib)) {
    user_lib <- file.path(
      path.expand("~"),
      "R",
      paste0(R.version$platform, "-library"),
      paste(R.version$major, strsplit(R.version$minor, ".", fixed = TRUE)[[1]][1], sep = ".")
    )
  }
  dir.create(user_lib, recursive = TRUE, showWarnings = FALSE)
  .libPaths(c(user_lib, .libPaths()))
}

# ── CRAN packages ─────────────────────────────────────────────────────────────

cran_packages <- c(
  # Core
  "bookdown",        # render engine
  "tidyverse",       # index.Rmd, all chapters
  "patchwork",       # 01-intro, 06-classification, 07-clustering
  "broom",           # 04-prediction, 06-classification, 07-clustering
  "janitor",         # 08-associationrules

  # Data / visualisation
  "visdat",          # 02-data, 03-missingvalues
  "naniar",          # 03-missingvalues
  "VIM",             # 03-missingvalues
  "palmerpenguins",  # 07-clustering
  "ggdendro",        # 07-clustering

  # tidymodels (meta-package covers rsample, recipes, parsnip, yardstick, ...)
  "tidymodels",      # 05-tidymodels, 06-classification
  "discrim",         # 06-classification (LDA/QDA via parsnip; not in core tidymodels)
  "rsample",         # resampling utilities
  "stacks",          # 09-ensembles (stacked ensembles)

  # Dimensionality reduction / visualization
  "uwot",            # UMAP embeddings
  "arrow",           # parquet file I/O

  # Prediction / modelling engines
  "baguette",        # 09-ensembles (bagged trees)
  "mirai",           # 09-ensembles (parallel daemons)
  "MASS",            # 06-classification (lda, qda)
  "rpart",           # 04-prediction (decision trees)
  "randomForest",    # 04-prediction
  "nnet",            # 04-prediction, 06-classification
  "ks",              # 06-classification (kernel discriminant analysis via tidykda)
  "naivebayes",      # 06-classification (naive Bayes engine for parsnip)
  "kknn",            # 06-classification (k-NN engine for parsnip)
  "glmnet",          # 09-ensembles (stacking meta-learner)
  "ranger",          # 04-prediction (random forest engine for parsnip)
  "xgboost",         # 09-ensembles (gradient boosting)
  "vip",             # variable importance plots
  "irlba",           # fast PCA for large matrices
  "cluster",         # 07-clustering (pam, silhouette)
  "dbscan",          # 07-clustering
  "skimr",           # 02-data (summary statistics)

  # Association rules
  "arules",          # 08-associationrules
  "arulesViz",       # 08-associationrules
  "DT",              # interactive tables in rendered HTML
  "knitr",           # chunk rendering
  "rmarkdown"        # base render engine
)

install.packages(cran_packages)

# ── GitHub packages (not on CRAN) ─────────────────────────────────────────────

if (!requireNamespace("remotes", quietly = TRUE)) install.packages("remotes")

# tidykda: kernel discriminant analysis wrapper for parsnip
# Source: https://github.com/jmarshallnz/tidykda  (noted in 06-classification.Rmd)
remotes::install_github("jmarshallnz/tidykda")

# reprtree: visualise individual trees from a randomForest object
# Source: https://github.com/araastat/reprtree  (used in 04-prediction.Rmd)
remotes::install_github("araastat/reprtree")
