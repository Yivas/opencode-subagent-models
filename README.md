# opencode-subagent-models

Switch every OpenCode subagent between its configured model and a shared model override.

Use a stronger model for a difficult task, move all delegated work to a cheaper model, or restore each subagent's original configuration with one command. Primary agents and agents with `mode: all` remain unchanged.

## Features

- Applies one `provider/model` override to every agent with `mode: subagent`.
- Restores each subagent's configured model without rewriting agent files.
- Includes the `/subagents-model` command for direct or prompted selection.
- Works with global and project-level subagents after OpenCode merges its configuration.

## Installation

Add the package to the `plugin` array in your global `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-models"]
}
```

OpenCode installs npm plugins automatically. Restart OpenCode after changing the configuration.

## Usage

Set one model for all subagents:

```text
/subagents-model openai/gpt-5.2-codex
```

Restore each subagent's configured model:

```text
/subagents-model default
```

Run the command without an argument to enter a model after a prompt:

```text
/subagents-model
```

OpenCode checks the configured permission before saving the new setting. Restart OpenCode to apply it to new subagent sessions.

## Scope

| Agent mode | Result |
| --- | --- |
| `subagent` | Uses the shared override when enabled |
| `primary` | Never changed |
| `all` | Never changed |
| `subagent` with `default` selected | Uses its own configured model |

## How it works

The plugin stores its setting in `~/.config/opencode/subagent-model.json`. At startup, it updates the merged OpenCode configuration only for agents whose mode is exactly `subagent`.

The `default` setting skips the override. It does not copy, edit, or back up agent files.

## Local development

```bash
npm install
npm test
npm pack --dry-run
```

Load a local checkout by adding its entry file to your OpenCode configuration:

```json
{
  "plugin": [
    "file:///path/to/opencode-subagent-models/src/index.ts"
  ]
}
```

## Requirements

- OpenCode `1.17.18` or newer.
- Node.js `22.18` or newer for local tests.

## License

[MIT](LICENSE)
