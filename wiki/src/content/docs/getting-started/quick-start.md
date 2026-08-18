---
title: Quick start
description: Select a model, choose its reasoning variant, and delegate work.
---

## 1. Open the selector

Use the command palette or run:

```text
/subagents-model
```

The first entry is **Default**. Models follow, grouped by provider.

## 2. Choose reasoning

After selecting a model, choose one of its available variants. Selecting **Default** at this second step uses the model's own default reasoning behavior.

## 3. Delegate

Start new delegated work. The plugin applies the selection when OpenCode creates the subagent message. The primary conversation keeps its current model.

## 4. Restore agent configuration

Run the global command again and choose **Default**. Each delegated subagent returns to the model configured for that agent.

:::note
Changing a selection affects new delegated messages. It does not rewrite messages that already exist.
:::

For a one-conversation exception, continue with [Session selection](../../guides/session-selection/).
