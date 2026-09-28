<p align="center"><img src="https://yivas.github.io/opencode-subagent-models/logo.svg" alt="Connected subagent model nodes" width="64" height="64"></p>

# opencode-subagent-models

Choose one model and reasoning variant for delegated OpenCode work, globally or for a single session.

[![CI](https://github.com/Yivas/opencode-subagent-models/actions/workflows/ci.yml/badge.svg)](https://github.com/Yivas/opencode-subagent-models/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-subagent-models)](https://www.npmjs.com/package/opencode-subagent-models)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Yivas/opencode-subagent-models/blob/main/LICENSE)

[Documentation](https://yivas.github.io/opencode-subagent-models/) · [Installation](#installation) · [Releases](https://github.com/Yivas/opencode-subagent-models/releases) · [Contributing](https://github.com/Yivas/opencode-subagent-models/blob/main/CONTRIBUTING.md)

OpenCode agents can already define their own models. This plugin adds a reversible override for subagents when one task needs a different balance of capability, cost, speed, or reasoning depth. It changes delegated messages only: the primary session keeps the model selected in OpenCode.

**Current release:** `0.2.3` · **Validated OpenCode baseline:** `1.17.18`

This is a `0.x` project in development. The selection commands and the saved state format can change between minor versions.

## Highlights

- Set one global `provider/model` and reasoning variant for delegated subagents.
- Override that selection for one session and its delegation branch.
- Restore each subagent's configured model without editing agent files.
- Use the command palette or `/subagents-model` and `/subagents-model-session`.
- Apply new selections without restarting OpenCode.
- Keep routing state local, with no analytics or plugin-owned network requests.

## Requirements

- OpenCode `1.17.18`. Other releases are unsupported unless they retain the same v1 TUI command bridge.
- Node.js `^22.22.2`, `^24.15.0`, or `>=26.0.0`. The package declares that range in its `engines` metadata; other versions are not tested.

## Installation

OpenCode loads server and TUI plugins from separate configuration files. Pin the same exact package version in both files so the hook and commands use the same state contract.

Add the package to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-models@0.2.3"]
}
```

Add it to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-subagent-models@0.2.3"]
}
```

Close every OpenCode process, then start OpenCode again.

## First use

Open the command palette with `Ctrl+P` and choose **Global subagent model**, or run:

```text
/subagents-model
```

Choose a model and then one of its available reasoning variants. New delegated messages use that route; the primary session does not change.

To make one session different, open it and choose **Session subagent model**, or run:

```text
/subagents-model-session
```

## Routing and Default

| Context | Result |
| --- | --- |
| Primary session | Keeps the model selected by OpenCode |
| Delegated work with a session override | Uses the nearest session model and variant |
| Delegated work without a session override | Uses the global selection |
| Global **Default** | Uses each subagent's configured model |
| Session **Default** | Stops ancestor-session inheritance and returns the branch to the global selection |

Session overrides apply to descendants in the same delegation branch. Other sessions and terminals keep their own override or inherit the global selection.

## State and failure behavior

The global selection is stored in `~/.config/opencode/subagent-model.json`. Session selections use one file per session under `~/.config/opencode/subagent-models/`. `XDG_CONFIG_HOME` replaces `~/.config` when it is defined.

The plugin stores only model routing choices. It does not store prompts, responses, provider credentials, or conversation content. Session selection files are named with the OpenCode session identifier. If saved state or session ancestry cannot be read safely, the hook keeps the model already selected by OpenCode instead of applying another override.

See [Default and inheritance](https://yivas.github.io/opencode-subagent-models/reference/default-and-inheritance/) and [Stored state](https://yivas.github.io/opencode-subagent-models/reference/stored-state/) for the complete resolution rules and schemas.

## Updating

Change the pinned version in both configuration files, close every OpenCode process, and start it again. Read the [changelog](https://github.com/Yivas/opencode-subagent-models/blob/main/CHANGELOG.md) before updating.

## Troubleshooting

If the commands are missing, verify both plugin entries and inspect `~/.local/share/opencode/log/opencode.log` for startup errors. If a slash command becomes an LLM prompt, OpenCode loaded a release older than `0.2.0`.

The [troubleshooting guide](https://yivas.github.io/opencode-subagent-models/guides/troubleshooting/) covers package caching, invalid state, unexpected routing, and safe diagnostics.

## Local development

```bash
npm ci
npm test
npm run check:package
npm pack --dry-run
```

Load a local checkout by adding its `file:///path/to/opencode-subagent-models` URL to the `plugin` array in both OpenCode configuration files. Install the checkout's dependencies before starting OpenCode.

## Security and privacy

Do not post tokens, prompts, session contents, local paths, active configuration, or unsanitized logs in a public issue. Report suspected vulnerabilities through [GitHub Private Vulnerability Reporting](https://github.com/Yivas/opencode-subagent-models/security/advisories/new). The full scope and supported-version policy are in [`SECURITY.md`](https://github.com/Yivas/opencode-subagent-models/blob/main/SECURITY.md).

## Contributing and support

This is an open source collaborative project under the MIT License. It accepts reproducible bug reports, focused feature proposals, documentation improvements, and pull requests. Read [`CONTRIBUTING.md`](https://github.com/Yivas/opencode-subagent-models/blob/main/CONTRIBUTING.md) and follow the [`CODE_OF_CONDUCT.md`](https://github.com/Yivas/opencode-subagent-models/blob/main/CODE_OF_CONDUCT.md).

Use the [issue forms](https://github.com/Yivas/opencode-subagent-models/issues/new/choose) for public support. No response or release deadline is promised.

## License

[MIT](https://github.com/Yivas/opencode-subagent-models/blob/main/LICENSE)
