# Contributing

This project accepts reproducible bug reports, focused feature proposals, documentation improvements, and pull requests. Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Choose the right channel

- Use the [bug report form](https://github.com/Yivas/opencode-subagent-models/issues/new?template=bug_report.yml) for behavior that differs from the documentation.
- Use the [feature request form](https://github.com/Yivas/opencode-subagent-models/issues/new?template=feature_request.yml) for a focused change to model routing.
- Use [GitHub Private Vulnerability Reporting](https://github.com/Yivas/opencode-subagent-models/security/advisories/new) for suspected vulnerabilities. Never open a public security issue.
- Open a pull request only for a change you are prepared to test and explain. Starting with an issue is useful when scope or compatibility is uncertain.

Search open and closed issues before submitting a new report or proposal.

## Write a useful report

A bug report must include:

- package, OpenCode, Node.js, and operating-system versions;
- the smallest reproducible sequence;
- expected and observed behavior;
- whether the problem affects a primary session, global selection, session selection, or **Default**;
- sanitized logs or configuration only when they are necessary to reproduce the problem.

Remove tokens, prompts, conversation content, session identifiers, local paths, active configuration, endpoints, and unrelated logs. Revoke an exposed secret before reporting it.

A feature request should describe the unsupported workflow, the proposed behavior, alternatives already tried, and how global, session, and **Default** behavior should interact.

## Development setup

Requirements:

- Node.js `^22.22.2`, `^24.15.0`, or `>=26.0.0`;
- npm.

Install and verify the package:

```bash
npm ci
npm test
npm run check:package
npm pack --dry-run
```

Build the documentation when changing `README.md`, `wiki/`, compatibility, installation, state, or commands:

```bash
cd wiki
npm ci
npm run build
```

Keep changes focused. Do not add telemetry, analytics, plugin-owned network calls, or persistent identifiers. The plugin must not change the primary session's model. Global **Default** must restore each subagent's configured model, and session **Default** must stop ancestor-session inheritance.

## Pull requests

A pull request should:

1. explain the user-visible problem and why the change belongs in this plugin;
2. summarize the chosen implementation and relevant alternatives;
3. add or update tests for behavior changes;
4. update documentation when commands, installation, compatibility, state, security, or user-visible behavior changes;
5. record verification on supported Node.js and OpenCode baselines;
6. identify compatibility, privacy, security, migration, and failure-mode risks;
7. contain only commits and files intended for the public repository.

Maintainers may request changes or close proposals that conflict with the plugin's scope. Submission does not guarantee inclusion, review, or a release date.

## Commit and privacy checks

Public commits describe the change and its verification. Do not append tool or agent inventories such as `MCP:` or `Agents:`. Remove prompts, session data, local paths, active configuration, private endpoints, and unnecessary personal identifiers from commit messages and file changes.

Before pushing, inspect the full branch diff and commit messages. Correct private metadata before it reaches the public repository; removing it later requires rewriting shared history. Use a GitHub-provided `noreply` address if you do not intend to publish your email in Git history.
