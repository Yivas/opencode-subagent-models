---
title: Compatibility
description: Supported OpenCode and Node.js versions, TUI bridge constraints, and upgrade guidance.
---

## OpenCode

The supported runtime is OpenCode `1.17.18`. Other versions work only while they retain the v1 TUI command bridge used by the plugin.

The server hook and TUI entry must load the same package version. Pin both configuration files instead of using an unversioned npm spec.

## Node.js for development

The repository verifies these lines:

- Node.js `^22.22.2`
- Node.js `^24.15.0`
- Node.js `>=26.0.0`

CI runs Node 22, 24, and 26 on Linux, plus Node 24 on Windows.

## Package format

The npm package publishes TypeScript source because OpenCode loads plugin entries directly. The package has no runtime dependency on `@opencode-ai/plugin`; its imports are type-only.

## Upgrading

1. Read the [changelog](https://github.com/Yivas/opencode-subagent-models/blob/main/CHANGELOG.md).
2. Change the version in both plugin configuration files.
3. Close every OpenCode process.
4. Restart and verify both commands in the palette.
