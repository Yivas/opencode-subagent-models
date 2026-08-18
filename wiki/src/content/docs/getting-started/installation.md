---
title: Installation
description: Install the server and TUI entries with one pinned package version.
---

OpenCode loads server and TUI plugins from separate files. Add the same exact version to both locations.

## Server configuration

Add the package to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-models@0.2.3"]
}
```

## TUI configuration

Add the package to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-subagent-models@0.2.3"]
}
```

Close every OpenCode process and start it again. OpenCode installs the pinned npm package during startup.

:::caution[Keep both entries aligned]
A server/TUI version mismatch can leave the hook loaded without its commands, or commands loaded against different stored-state behavior.
:::

## Verify

1. Open the command palette with `Ctrl+P`.
2. Search for **Global subagent model**.
3. Confirm that **Session subagent model** also appears.
4. Open a conversation before using the session command.

If the commands are missing, continue to [Troubleshooting](../../guides/troubleshooting/).
