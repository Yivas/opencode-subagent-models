# opencode-subagent-models

Set one model and reasoning variant for every OpenCode subagent, globally or for one session.

Use a stronger model for a difficult task, move all delegated work to a cheaper model, or restore each subagent's original configuration with one command. Primary agents and agents with `mode: all` remain unchanged.

## Features

- Applies a global `provider/model` override to delegated subagents.
- Lets one session and its delegated subagents override the global selection.
- Restores each subagent's configured model without rewriting agent files.
- Adds global and session model commands under `Agent` in the command palette.
- Registers `/subagents-model` and `/subagents-model-session`.
- Works with global and project-level subagents after OpenCode merges its configuration.

## Installation

OpenCode loads server and TUI plugins from separate configuration files. Add the package to both files.

`~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-models"]
}
```

`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-subagent-models"]
}
```

OpenCode installs npm plugins automatically. Restart OpenCode after changing either configuration file.

## Usage

Open the command palette and choose **Global subagent model** or **Session subagent model**. The matching slash commands are:

```text
/subagents-model
/subagents-model-session
```

Each model selector keeps **Default** first, followed by models grouped by provider. After choosing a model, select its reasoning variant. Global **Default** restores each subagent's configuration. Session **Default** removes the session override and inherits the global selection.

The session override applies to subagents delegated from that conversation. Other sessions and terminals keep their own session override or inherit the global selection.

## Scope

| Agent mode | Result |
| --- | --- |
| Delegated subagent | Uses the global override when enabled |
| Delegated subagent in an overridden session | Uses the session model and variant |
| Primary session | Never changed |
| Subagent with global `Default` | Uses its configured model |

## How it works

The global selection is stored in `~/.config/opencode/subagent-model.json`. Session selections use one file per session under `~/.config/opencode/subagent-models/`; selecting session **Default** writes a default marker there. A message hook resolves the nearest session override, then the global selection, whenever OpenCode starts a delegated subagent.

The `default` setting skips the override. It does not copy, edit, or back up agent files.

## Local development

```bash
npm install
npm test
npm pack --dry-run
```

Load a local checkout by adding its directory to the `plugin` array in both `opencode.json` and `tui.json`, so the server and TUI entries resolve:

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
