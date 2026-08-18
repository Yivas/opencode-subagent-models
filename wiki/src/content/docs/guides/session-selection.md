---
title: Session selection
description: Override delegated work below one conversation without changing other sessions.
---

A session selection applies to subagents delegated from that conversation and to deeper delegated branches until another session marker takes precedence.

## Create an override

Open the target conversation, then choose **Session subagent model** or run:

```text
/subagents-model-session
```

Choose a model and reasoning variant. Other conversations and terminals keep their own route or inherit the global selection.

## Inheritance example

```text
Project session          session override: provider/model-a
└─ Review subagent       uses provider/model-a
   └─ Research subagent  uses provider/model-a
```

If the review subagent's conversation receives its own session selection, its descendants use that nearer selection.

## Session Default

Choosing **Default** for a session writes an explicit marker. That marker stops inheritance from session ancestors and returns the branch to the global selection.

:::caution
Session **Default** does not mean “inherit the nearest session.” It deliberately stops ancestor-session inheritance.
:::
