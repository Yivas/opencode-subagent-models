---
title: Global selection
description: Route delegated work from every session through one model and reasoning variant.
---

The global selector provides the fallback for delegated work that has no session override.

## Set the override

Open **Global subagent model** or run:

```text
/subagents-model
```

Choose a provider/model pair, then a reasoning variant. The TUI confirms the stored selection with a success toast.

## What changes

- New delegated subagent messages use the selected model.
- Sessions without their own override inherit this selection.
- Primary-session messages remain untouched.
- Existing agent configuration files remain untouched.

## Clear the override

Choose **Default** in the model selector. This clears the forced global route and restores each subagent's configured model.

:::tip[Use exact model IDs]
The UI displays the human-readable model name and the `provider/model` identifier together. Use the identifier when comparing configuration or saved state.
:::
