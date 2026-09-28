# Security policy

## Supported versions

Security fixes target the latest version published to npm.

| Version | Supported |
| --- | --- |
| Latest npm release | Yes |
| Older releases | No |

Upgrade before reporting a problem that occurs only on an older release. If upgrading is unsafe or prevents reproduction, explain why in the private report.

## Security boundary

The plugin selects a model and reasoning variant for delegated OpenCode messages. It stores routing choices in its documented local JSON files and uses OpenCode's existing plugin permissions and provider transport.

A report belongs here when the plugin:

- exposes prompts, conversation content, credentials, local data, or stored routing state;
- changes a primary session's model;
- crosses a session-override boundary;
- accepts corrupt state or unsafe session ancestry in a way that changes routing;
- writes outside its documented state files;
- enables code execution beyond OpenCode's normal plugin permissions.

General OpenCode, provider, model, terminal, operating-system, or npm vulnerabilities are outside this project's security boundary unless this plugin causes or amplifies them. The plugin is not an operating-system sandbox and does not control provider-side data handling.

## Report a vulnerability

Use [GitHub Private Vulnerability Reporting](https://github.com/Yivas/opencode-subagent-models/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Include:

- the affected package and OpenCode versions;
- operating system and Node.js version;
- the smallest sanitized reproduction;
- expected and observed behavior;
- the security impact;
- any workaround already tested.

Remove tokens, prompts, conversation content, session identifiers, local paths, private endpoints, active configuration, and unrelated logs. Replace sensitive values with explicit placeholders. If a secret was exposed, revoke it before sending the report.

## What happens next

The maintainer will use the private advisory to validate scope, request missing evidence, discuss a fix, and coordinate disclosure when appropriate. The project does not promise a response deadline, release date, bounty, CVE, or embargo period.

If the report is outside this project's boundary, the maintainer may direct it to OpenCode, a provider, or another affected project without copying private data unnecessarily.
