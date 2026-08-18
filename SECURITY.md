# Security policy

## Supported versions

Security fixes target the latest version published to npm. Upgrade to the current release before reporting a problem that only affects an older version.

## Report a vulnerability

Use [GitHub Private Vulnerability Reporting](https://github.com/Yivas/opencode-subagent-models/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Include:

- the affected package version and OpenCode version;
- the operating system and Node.js version;
- steps or a minimal example that reproduces the problem;
- the impact you observed;
- any workaround you have tested.

Remove tokens, prompts, session contents, local paths, and other private data from the report. If a secret was exposed, revoke it before sending the report.

The maintainer will use the private advisory to discuss validation, a fix, and coordinated disclosure. This project does not promise a response or release deadline.

## Scope

Reports are relevant when the plugin exposes data, changes a primary session's model, crosses session boundaries, writes outside its documented state files, or enables code execution beyond OpenCode's normal plugin permissions. General OpenCode security issues belong in the OpenCode project unless this plugin causes or amplifies them.
