# Contributing

This project accepts bug reports, feature proposals, and pull requests.

## Before you start

Search the existing issues before opening a new one. For security problems, follow [`SECURITY.md`](SECURITY.md) instead of using a public issue.

A useful issue includes the package version, OpenCode version, Node.js version, operating system, steps to reproduce, expected behavior, and actual behavior. Remove prompts, session contents, tokens, and local configuration values.

## Development

Requirements:

- Node.js `^22.22.2`, `^24.15.0`, or `>=26.0.0`;
- npm.

Install and verify the project:

```bash
npm install
npm test
npm pack --dry-run
```

Keep changes focused. Do not add telemetry, analytics, network calls, or persistent identifiers. The plugin must not change the primary session's model, and selecting **Default** must preserve each subagent's configured model.

## Commit hygiene

Public commits describe the change and its verification. Do not append tool or agent inventories such as `MCP:` or `Agents:`. Remove prompts, session data, local paths, active configuration, and unnecessary personal identifiers from commit messages as well as file changes. Use a GitHub-provided `noreply` address if you do not intend to publish your email in Git history.

Before pushing, inspect the complete commit messages and diff for the branch. Correct metadata before it reaches the public repository; removing it later requires rewriting shared history.

## Pull requests

1. Explain the user-visible problem and the chosen fix.
2. Add or update tests for behavior changes.
3. Update user documentation when commands, installation, compatibility, or stored state changes.
4. Run `npm test` and `npm pack --dry-run`.
5. Confirm that the commits and diff contain no tokens, prompts, session data, machine-specific paths, local configuration, or tool and agent inventories.

Maintainers may ask for changes or close proposals that conflict with the plugin's scope. Submission does not guarantee inclusion or a release date.
