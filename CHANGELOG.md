# Changelog

This file records user-visible changes to the npm package. npm provides the source commit for each published version through `gitHead`; releases published before this changelog do not have Git tags or GitHub Releases.

## Unreleased

### Fixed

- Keep the model selected by OpenCode when session ancestry or saved override state cannot be read safely.
- Reject corrupt and invalid saved state instead of inheriting an ancestor or global override.
- Detect cycles in session ancestry before they can block message handling.
- Report saved-state read failures in the TUI without leaving an unhandled promise rejection.

### Added

- Cover global and session TUI commands, provider ordering, reasoning variants, Default behavior, persistence failures, and plugin disposal in the test suite.
- Run tests and inspect package contents in GitHub Actions for pushes and pull requests.

## 0.2.1 - 2026-07-12

- Pin the same package version in the server and TUI configuration examples.
- Document OpenCode's npm plugin cache behavior, updates, and troubleshooting.
- Publish from source commit `a19c348`.

## 0.2.0 - 2026-07-12

- Add native global and session model selectors to the OpenCode command palette.
- Register `/subagents-model` and `/subagents-model-session` without an LLM call.
- Add reasoning variant selection and per-session inheritance rules.
- Apply new selections to delegated messages without changing primary sessions.
- Publish from source commit `637ffa2`.

## 0.1.1 - 2026-07-11

- Add the package `main` entry required by OpenCode's npm plugin loader.
- Publish from source commit `2a86b79`.

## 0.1.0 - 2026-07-11

- Add a persisted global model override for OpenCode subagents.
- Preserve primary agents and restore each subagent's configured model with Default.
- Publish from source commit `19bd97d`.
