--- 
title: "Data mining"
author: "Jonathan Marshall, Martin Hazelton, Nick Knowlton"
date: "2026-05-03"
site: bookdown::bookdown_site
documentclass: book
#bibliography: [packages.bib]
# url: your book url like https://bookdown.org/yihui/bookdown
# cover-image: path to the social sharing image like images/cover.jpg
description: |
  Data mining notes
link-citations: yes
github-repo: jmarshallnz/161324
always_allow_html: true
---


``` r
library(tidyverse)
```

```
## ── Attaching core tidyverse packages ──────────────────────── tidyverse 2.0.0 ──
## ✔ dplyr     1.2.1     ✔ readr     2.2.0
## ✔ forcats   1.0.1     ✔ stringr   1.6.0
## ✔ ggplot2   4.0.3     ✔ tibble    3.3.1
## ✔ lubridate 1.9.5     ✔ tidyr     1.3.2
## ✔ purrr     1.2.2     
## ── Conflicts ────────────────────────────────────────── tidyverse_conflicts() ──
## ✖ dplyr::filter() masks stats::filter()
## ✖ dplyr::lag()    masks stats::lag()
## ℹ Use the conflicted package (<http://conflicted.r-lib.org/>) to force all conflicts to become errors
```

``` r
knitr::opts_chunk$set(comment = "#>")
theme_set(theme_minimal())
options(pillar.sigfig = 5)
```

# Preface {-}

This is the study guide for 161.324 Data Mining and 161.777 Practical Data Mining at Massey University.

It is put together based on existing notes from previous courses, updated in 2022 to utilise
the tidyverse suite of packages.

It will be progressively updated over time.
