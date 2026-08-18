---
title: Local development
description: Install, test, package, and load a local checkout safely.
---

## Requirements

Use a supported Node.js version and npm.

```bash
npm install
npm test
npm run check:package
```

`npm test` runs TypeScript checks and the behavior suite. `npm run check:package` compares the npm file list against an exact allowlist.

## Load the checkout

Add the repository directory to both plugin files:

```json
{
  "plugin": [
    "file:///path/to/opencode-subagent-models"
  ]
}
```

Restart OpenCode after changing plugin configuration.

## Wiki development

The documentation site has its own lockfile:

```bash
cd wiki
npm ci
npm run build
npm run dev
```

The production site uses the `/opencode-subagent-models/` base path. Test generated links under that prefix before deployment.

## Before a commit

- Keep the primary-session and Default contracts intact.
- Add tests for behavior changes.
- Inspect the package contents.
- Remove prompts, local paths, configuration, tokens, and tool metadata from commits.
