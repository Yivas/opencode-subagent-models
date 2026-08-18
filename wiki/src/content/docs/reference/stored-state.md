---
title: Stored state
description: File locations, schemas, validation, and cleanup behavior.
---

The plugin stores only model routing choices. It does not store prompts, responses, tokens, or provider credentials.

## Locations

| Scope | Path |
| --- | --- |
| Global | `~/.config/opencode/subagent-model.json` |
| Session | `~/.config/opencode/subagent-models/<session-id>.json` |

`XDG_CONFIG_HOME` replaces `~/.config` when it is defined.

## Forced state

```json
{
  "mode": "forced",
  "model": "provider/model",
  "variant": "high"
}
```

The `variant` property is omitted when the model's default reasoning should apply.

## Default marker

```json
{
  "mode": "default"
}
```

The reader accepts only the documented fields and validates the `provider/model` format. Writes use a temporary file and atomic rename.

:::note
Session-state files remain on disk so the selection survives OpenCode restarts. They are small and contain no conversation content.
:::
