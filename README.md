# opencode-subagent-models

Switch every OpenCode subagent between its configured model and a shared model override.

Use a stronger model for a difficult task, move all delegated work to a cheaper model, or restore each subagent's original configuration with one command. Primary agents and agents with `mode: all` remain unchanged.

## Features

- Applies one `provider/model` override to every agent with `mode: subagent`.
- Restores each subagent's configured model without rewriting agent files.
- Adds a "Change subagent model" entry to the command palette that opens a native model selector.
- Registers `/subagents-model` to open the same selector.
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

Open the command palette and pick **Change subagent model**, or type:

```text
/subagents-model
```

Both open a native selector listing every model from your configured providers, plus a **Default** entry that restores each subagent's own configuration. Selecting an option saves it immediately.

Restart OpenCode to apply the new setting to subagent sessions.

## Scope

| Agent mode | Result |
| --- | --- |
| `subagent` | Uses the shared override when enabled |
| `primary` | Never changed |
| `all` | Never changed |
| `subagent` with `default` selected | Uses its own configured model |

## How it works

The selector stores its setting in `~/.config/opencode/subagent-model.json`. At startup, the plugin updates the merged OpenCode configuration only for agents whose mode is exactly `subagent`.

The `default` setting skips the override. It does not copy, edit, or back up agent files.

## Local development

```bash
npm install
npm test
npm pack --dry-run
```

Load a local checkout by adding its directory to your OpenCode configuration, so both the server and TUI entries resolve:

```json
{
  "plugin": [
    "file:///path/to/opencode-subagent-models"
  ]
}
```

## Requirements

- OpenCode `1.17.18`. The plugin currently uses OpenCode's v1 TUI command bridge.
- Node.js `22.18` or newer for local tests.

## License

[MIT](LICENSE)
