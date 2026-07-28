## ADDED Requirements

### Requirement: Build a deployable image
The system SHALL provide a container image build that produces a runnable
artifact containing the built frontend, the application code, and the
committed database, requiring no separate provisioning step at container
startup.

#### Scenario: Building the image
- **WHEN** the container image is built
- **THEN** the resulting image includes the built frontend static assets, the
  application code, and `data/schools.sqlite3`, and starting a container from
  it serves the full application without any additional setup

### Requirement: Gate merges on automated checks
The system SHALL run the backend test suite and a frontend build/lint check
on every push and pull request, and SHALL prevent a failing check from being
considered passing.

#### Scenario: Pull request with a failing test
- **WHEN** a pull request is opened or updated and the backend test suite or
  the frontend build/lint check fails
- **THEN** the CI check is reported as failing on that pull request

#### Scenario: Pull request with all checks passing
- **WHEN** a pull request is opened or updated and both the backend test
  suite and the frontend build/lint check succeed
- **THEN** the CI check is reported as passing on that pull request

### Requirement: Deploy automatically on merge to main
The system SHALL build and deploy a new image to the hosting platform
whenever a change is merged to the main branch and the automated checks for
that change passed, without requiring a manual deploy step.

#### Scenario: Merge to main after checks pass
- **WHEN** a pull request whose checks passed is merged into the main branch
- **THEN** a new image is built from that commit and deployed to the running
  instance without manual intervention

#### Scenario: Deploy does not run for failed checks
- **WHEN** a commit on the main branch corresponds to a change whose
  automated checks failed
- **THEN** no deploy is triggered for that commit

### Requirement: Run as a single always-on instance
The system SHALL run as a single, continuously-running instance on the
hosting platform, rather than an instance that stops after a period of
inactivity.

#### Scenario: Request after a period of no traffic
- **WHEN** a client requests the site after an extended period with no
  incoming requests
- **THEN** the response is served without a cold-start delay, because the
  instance was already running

### Requirement: Provide runtime credentials via secrets
The system SHALL supply credentials required at runtime (OneMap
email/password for the live geocode search endpoint) to the deployed
instance via the hosting platform's secret storage, and SHALL supply the
credential used to authorize deploys via the CI platform's secret storage,
without either being committed to the repository.

#### Scenario: Live geocode search in production
- **WHEN** the deployed instance receives a request to the geocode search
  endpoint
- **THEN** it authenticates to OneMap using credentials read from the hosting
  platform's runtime secret storage, not from a file in the repository

#### Scenario: Deploy step authorizes without a committed credential
- **WHEN** the CI pipeline's deploy step runs
- **THEN** it authorizes against the hosting platform using a credential read
  from the CI platform's secret storage, not from a file in the repository
