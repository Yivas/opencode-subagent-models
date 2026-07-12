# opencode-subagent-models

Set one model and reasoning variant for every OpenCode subagent, globally or for one session.

Use a stronger model for a difficult task, move delegated work to a cheaper model, or restore each subagent's configured model. Primary sessions remain unchanged.

## Features

- Applies a global `provider/model` override to delegated subagents.
- Lets one session and its delegated subagents override the global selection.
- Restores each subagent's configured model without rewriting agent files.
- Adds global and session model commands under `Agent` in the command palette.
- Registers `/subagents-model` and `/subagents-model-session`.
- Applies changes to new delegated subagent messages without restarting OpenCode.

## Installation

OpenCode loads server and TUI plugins from separate configuration files. Add the same exact package version to both files. OpenCode caches npm plugin specs, so a pinned version avoids reusing an unversioned cache from an older release.

`~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-models@0.2.1"]
}
```

`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-subagent-models@0.2.1"]
}
```

Close every OpenCode instance, then start it again. OpenCode installs the pinned package on startup.

## Usage

Open the command palette and choose **Global subagent model** or **Session subagent model**. The matching slash commands are:

```text
/subagents-model
/subagents-model-session
```

Each model selector keeps **Default** first, followed by models grouped by provider. After choosing a model, select its reasoning variant. Models without variants show only **Default** in the second selector.

Global **Default** restores each subagent's configured model. Session **Default** stops inheritance from session ancestors and uses the global selection.

The session override applies to subagents delegated from that conversation. Other sessions and terminals keep their own session override or inherit the global selection.

## Scope

| Context | Result |
| --- | --- |
| Delegated subagent | Uses the global override when enabled |
| Delegated subagent in an overridden session | Uses the session model and variant |
| Primary session | Never changed |
| Global `Default` | Each delegated subagent uses its configured model |

## How it works

The global selection is stored in `~/.config/opencode/subagent-model.json`. Session selections use one file per session under `~/.config/opencode/subagent-models/`; selecting session **Default** writes a default marker there. For each delegated message, a hook resolves the nearest session override and then the global selection.

The `default` setting skips the matching override. The plugin does not copy, edit, or back up agent files.

## Updating

Change the pinned version in both `opencode.json` and `tui.json`, then close every OpenCode instance and reopen it. Keep both files on the same version.

## Troubleshooting

If the commands do not appear in `Ctrl+P`, confirm that the package is present in both configuration files and that both use the same exact version. Then inspect the OpenCode startup log at `~/.local/share/opencode/log/opencode.log` for plugin loading errors.

If `/subagents-model` is sent to the LLM as a prompt, OpenCode loaded a release older than `0.2.0`. Pin the current version in both files and restart every OpenCode instance. The exact version creates a separate cache, so manual cache deletion is not required.

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

- OpenCode `1.17.18`. Other releases work only while they retain the v1 TUI command bridge.
- Node.js `^22.22.2`, `^24.15.0`, or `>=26.0.0` for local development.

## License

[MIT](LICENSE)
