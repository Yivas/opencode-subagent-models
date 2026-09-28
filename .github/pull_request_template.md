## Summary

Describe the user-visible problem and why it belongs in this plugin.

## Changes

Explain the implementation and any relevant alternatives you rejected.

## Verification

List the commands and manual checks you ran, including the OpenCode, Node.js, and operating-system versions.

- [ ] `npm test`
- [ ] `npm run check:package`
- [ ] `npm pack --dry-run`
- [ ] `cd wiki && npm run build` when documentation or public behavior changed
- [ ] Tests cover changed behavior, or the reason tests do not apply is explained

## Compatibility and risks

Describe effects on primary sessions, global selection, session selection, **Default**, stored state, providers, the TUI bridge, failure behavior, privacy, and security. Write “None” only after checking each relevant area.

## Documentation and release impact

**Release impact:** none, patch, minor, or major.

- [ ] README, wiki, compatibility, installation, security, and changelog content reflect user-visible changes
- [ ] Migration or upgrade steps are included when users must act

## Public-data checklist

- [ ] I inspected the full diff and commit messages
- [ ] The change contains no credentials, prompts, conversation content, session identifiers, private endpoints, machine-specific paths, active configuration, unsanitized logs, or tool and agent inventories
- [ ] New dependencies, network access, persistent data, and attribution are documented and justified, or the change adds none of them
- [ ] I have read and will follow the [Code of Conduct](https://github.com/Yivas/opencode-subagent-models/blob/main/CODE_OF_CONDUCT.md)
