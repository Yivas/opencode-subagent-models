---
title: Default and inheritance
description: Exact precedence rules for global state, session state, and configured agent models.
---

The word **Default** has different effects at the two scopes.

## Global Default

Global **Default** disables the shared override. OpenCode uses the model configured for each delegated agent.

## Session Default

Session **Default** creates an explicit boundary. Descendants stop looking at session ancestors and use the global state instead.

## Precedence

For a delegated message, the plugin resolves state in this order:

1. Start at the message's parent session.
2. Walk toward the root.
3. Use the first forced session state found.
4. If the first session state is **Default**, stop the walk and use global state.
5. If no session state exists, use global state.
6. If global state is **Default**, leave OpenCode's selected model unchanged.

A primary session has no parent in this lookup and is never overridden.

## Failure behavior

Missing files mean “no state at this scope.” Corrupt, invalid, or unreadable files are different: the plugin stops resolution and keeps the model already selected by OpenCode.
