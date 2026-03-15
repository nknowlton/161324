# Install all packages required for the 161.324 Data Mining notes
# Run this once before rendering the bookdown notes.

# ── CRAN packages ─────────────────────────────────────────────────────────────

cran_packages <- c(
  # Core
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

  # Prediction / modelling engines
  "MASS",            # 06-classification (lda, qda)
  "rpart",           # 04-prediction (decision trees)
  "randomForest",    # 04-prediction
  "nnet",            # 04-prediction, 06-classification
  "ks",              # 06-classification (kernel discriminant analysis via tidykda)
  "naivebayes",      # 06-classification (naive Bayes engine for parsnip)
  "kknn",            # 06-classification (k-NN engine for parsnip)
  "ranger",          # 04-prediction (random forest engine for parsnip)
  "cluster",         # 07-clustering (pam, silhouette)
  "dbscan",          # 07-clustering

  # Association rules
  "arules",          # 08-associationrules
  "arulesViz",        # 08-associationrules
  "baguette"         # 08-associationrules (word cloud visualization for itemsets/rules
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
