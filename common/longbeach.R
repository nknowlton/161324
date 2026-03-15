prepare_longbeach_adoption_data <- function(longbeach) {
  weekday_levels <- c("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

  # Normalise blanks and any case-variant of "unknown" to NA so step_unknown() can handle them
  clean_chr <- function(x) dplyr::if_else(is.na(x) | trimws(x) == "" | tolower(trimws(x)) == "unknown", NA_character_, x)

  longbeach |>
    dplyr::filter(
      animal_type %in% c("dog", "cat"),
      !is.na(outcome_type)
    ) |>
    dplyr::mutate(
      dob = as.Date(dob),
      intake_date = as.Date(intake_date),
      age_days = as.numeric(intake_date - dob),
      age_days = dplyr::if_else(is.na(age_days) | age_days < 0, NA_real_, age_days),
      age_years = pmin(dplyr::coalesce(age_days, stats::median(age_days, na.rm = TRUE)), 3650) / 365.25,
      has_name = dplyr::if_else(is.na(animal_name) | animal_name == "", "No", "Yes"),
      intake_year = factor(format(intake_date, "%Y")),
      intake_month = factor(format(intake_date, "%b"), levels = month.abb),
      intake_weekday = factor(weekdays(intake_date), levels = weekday_levels),
      is_adopted = factor(
        dplyr::if_else(outcome_type == "adoption", "Adopted", "Other"),
        levels = c("Other", "Adopted")
      )
    ) |>
    dplyr::transmute(
      is_adopted,
      animal_type = factor(animal_type),
      sex = factor(clean_chr(sex)),
      primary_color = factor(clean_chr(primary_color)),
      intake_condition = factor(clean_chr(intake_condition)),
      intake_type = factor(clean_chr(intake_type)),
      intake_subtype = factor(clean_chr(intake_subtype)),
      has_name = factor(has_name),
      intake_year,
      intake_month,
      intake_weekday,
      age_years
    )
}
