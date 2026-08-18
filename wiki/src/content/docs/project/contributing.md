---
title: Contributing
description: Submit focused issues and pull requests without exposing private data.
---

The project accepts bug reports, feature proposals, documentation improvements, and pull requests.

## Before opening an issue

Search existing issues. Include the package, OpenCode, Node.js, and operating-system versions; minimal reproduction steps; expected behavior; and actual behavior.

Remove tokens, prompts, session contents, machine-specific paths, and active configuration. Report vulnerabilities through the private channel described on the [Security](../security/) page.

## Pull requests

1. Explain the user-visible problem.
2. Keep the change within the plugin's model-routing scope.
3. Add or update tests for behavior changes.
4. Update documentation when commands, compatibility, installation, or stored state changes.
5. Run `npm test` and `npm run check:package`.
6. Inspect every commit message and the full diff for private data or tool inventories.

Read the complete [contribution guide](https://github.com/Yivas/opencode-subagent-models/blob/main/CONTRIBUTING.md) before submitting work.
