## MODIFIED Requirements

### Requirement: Show basic identifying info on interaction
The system SHALL show a school's name and address in a popup when its pin is hovered or clicked. The popup SHALL also offer an expandable section showing that school's most-recent-year admission data, collapsed by default, and a "More Details" link to that school's dedicated detail page.

#### Scenario: Hovering or clicking a pin
- **WHEN** a user hovers over or clicks a school's pin
- **THEN** a popup appears showing that school's name and address, with an expandable "Show admissions" section available and collapsed by default, and a "More Details" link to that school's detail page

## ADDED Requirements

### Requirement: Prefetch detail page data on pin interaction
The system SHALL begin fetching a school's detail-page data (its detail fields and full admission history) as soon as that school's popup is opened, rather than waiting until the "More Details" link is clicked.

#### Scenario: Opening a school's popup
- **WHEN** a user hovers over or clicks a school's pin, opening its popup
- **THEN** the system begins fetching that school's detail fields and full admission history in the background, independent of whether the user subsequently clicks "More Details"

#### Scenario: Clicking More Details after the popup has been open
- **WHEN** a user clicks "More Details" after that school's popup has already triggered the prefetch and the prefetch has completed
- **THEN** the detail page renders from the already-fetched data without issuing new requests for it
