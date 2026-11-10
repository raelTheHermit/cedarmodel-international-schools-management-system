# Report-card layout notes

This project keeps the report-card structure in versioned JSON files rather than hard-coding the fields in the UI.

## Primary layout

The primary layout is designed for lower- and upper-primary classes. It includes:

- student header details: student name, class, term, session, admission number
- subject rows with test, exam, total, grade and position
- summary values for average, class average, attendance and next-term target
- teacher and principal comments

## Secondary layout

The secondary layout follows the same pattern, but adds a conduct field in the summary section and keeps the same general academic structure used on the paper report-card.

## Notes and uncertainties

- The exact wording of some school-specific labels may differ from one school to another, so the config is intentionally generic and easy to adjust.
- The paper reference cards appear to use a common pattern: header details, score columns, grading, and comments. The specific subject list is expected to vary from class to class and is therefore modelled as a data-driven subject table rather than hard-coded into the UI.
- Attendance and conduct fields are kept as data points that can be filled from the uploaded results sheet without altering the layout config at code level.
