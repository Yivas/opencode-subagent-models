---
title: Troubleshooting
description: Diagnose missing commands, stale package caches, invalid state, and unexpected routing.
---

## Commands do not appear

1. Confirm that `opencode.json` and `tui.json` both contain the package.
2. Confirm that both entries use the same exact version.
3. Close every OpenCode process and start it again.
4. Inspect `~/.local/share/opencode/log/opencode.log` for plugin loading errors.

## Slash command becomes an LLM prompt

OpenCode loaded a release older than `0.2.0`. Pin `0.2.3` in both files and restart all OpenCode processes. The exact version creates a separate npm cache entry.

## A subagent keeps its configured model

Check these conditions:

- The message belongs to a delegated session, not a primary session.
- The selected model still exists in the active provider catalog.
- A nearer session **Default** marker is not stopping ancestor inheritance.
- The saved state file is valid JSON.

## State cannot be read

The plugin preserves the model already chosen by OpenCode when saved state or session ancestry cannot be resolved safely. It emits a sanitized warning rather than routing the message through another override.

## Reset manually

Use the TUI selectors whenever possible. If you inspect files directly, see [Stored state](../../reference/stored-state/) first and keep a backup outside the OpenCode configuration directory.

:::danger
Do not paste provider tokens, prompts, session contents, or active configuration into a public issue.
:::
