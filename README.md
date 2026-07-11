# opencode-subagent-models

OpenCode plugin that switches every subagent between its own configured model and one shared model override.

Primary agents are never changed. Agents with `mode: all` are also left untouched.

## Install

Add the npm package to your global `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-models"]
}
```

Restart OpenCode after changing the configuration.

## Use

Set one model for every agent with `mode: subagent`:

```text
/subagents-model openai/gpt-5.2-codex
```

Restore each subagent's original configuration:

```text
/subagents-model default
```

Run `/subagents-model` without an argument to choose interactively. OpenCode asks for confirmation before persisting a change. Restart OpenCode after changing modes.

## How it works

The plugin stores only the selected mode in `~/.config/opencode/subagent-model.json`. During startup it mutates the merged OpenCode configuration only for entries whose mode is exactly `subagent`.

`default` removes the runtime override rather than copying or rewriting agent files. Project-specific agents are included because the plugin receives OpenCode's merged configuration.

## Local development

```bash
npm install
npm test
npm pack --dry-run
```

To load a local checkout, add its entry file to `plugin`:

```json
{
  "plugin": [
    "file:///D:/Documents/1.Codigo/opencode-subagent-models/src/index.ts"
  ]
}
```

## License

MIT
