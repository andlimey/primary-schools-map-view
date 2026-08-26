## ADDED Requirements

### Requirement: Detail page shows an oversubscription trend chart per phase
The system SHALL, on a school's detail page, display a line chart above the admissions table showing each admission phase's oversubscription ratio (applied ÷ vacancy) across the years of available data, with a reference line marking the 100% (applied = vacancy) threshold.

#### Scenario: Loading the detail page for a school with multi-year data
- **WHEN** a user navigates to the detail page for a school that has admission phase records for more than one year
- **THEN** the page shows a chart with one line per phase, plotting that phase's applied ÷ vacancy ratio by year in chronological (oldest to newest) order, with a reference line at the 100% threshold

#### Scenario: A phase/year has no usable vacancy data
- **WHEN** a phase has no entry for a given year, or its `vacancy` value is null or zero for that year
- **THEN** that phase's line has a gap at that year rather than a plotted zero or an interpolated value

#### Scenario: Loading the detail page for a school with no ballot data
- **WHEN** a user navigates to the detail page for a school that has no admission phase records for any year
- **THEN** the page does not show the trend chart, consistent with the existing "No admission data" indication

### Requirement: Trend chart phases can be filtered independently of the table
The system SHALL provide phase-toggle filter chips above the trend chart, one per phase shown in the chart, that show or hide that phase's line when toggled, without affecting which phases or years are displayed in the admissions table.

#### Scenario: Toggling a phase chip off
- **WHEN** a user toggles off a phase's filter chip
- **THEN** that phase's line is hidden from the chart, and the admissions table below continues to show that phase's column unchanged

#### Scenario: All chips are on by default
- **WHEN** a user loads the detail page
- **THEN** every phase present in the chart has its filter chip on by default, so all phase lines are initially visible
