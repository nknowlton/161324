prepare_longbeach_adoption_data <- function(longbeach) {
  weekday_levels <- c("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

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
      sex = factor(dplyr::coalesce(dplyr::na_if(sex, ""), "Unknown")),
      primary_color = factor(dplyr::coalesce(dplyr::na_if(primary_color, ""), "Unknown")),
      intake_condition = factor(dplyr::coalesce(dplyr::na_if(intake_condition, ""), "Unknown")),
      intake_type = factor(dplyr::coalesce(dplyr::na_if(intake_type, ""), "Unknown")),
      intake_subtype = factor(dplyr::coalesce(dplyr::na_if(intake_subtype, ""), "Unknown")),
      has_name = factor(has_name),
      intake_year,
      intake_month,
      intake_weekday,
      age_years
    )
}
