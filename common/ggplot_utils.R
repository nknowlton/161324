compose_ggplot <- function(plot, ...) {
  layers <- list(...)

  for (i in seq_along(layers)) {
    plot <- ggplot2:::add_ggplot(plot, layers[[i]], paste0("layer_", i))
  }

  plot
}
