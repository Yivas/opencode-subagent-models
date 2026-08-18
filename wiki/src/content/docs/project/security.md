---
title: Security
description: Report vulnerabilities privately and understand the plugin's security boundary.
---

Use [GitHub Private Vulnerability Reporting](https://github.com/Yivas/opencode-subagent-models/security/advisories/new) for suspected vulnerabilities. Do not open a public issue.

## Relevant reports

A report belongs here when the plugin:

- exposes prompts, session contents, credentials, or local data;
- changes a primary session's model;
- crosses session-override boundaries;
- writes outside its documented state files;
- enables execution beyond normal OpenCode plugin permissions.

General OpenCode vulnerabilities belong in the OpenCode project unless this plugin causes or amplifies them.

## What to include

Provide affected versions, environment, minimal reproduction, observed impact, and tested workarounds. Sanitize logs and examples. Revoke an exposed secret before reporting it.

The project does not promise a response or release deadline. See the full [security policy](https://github.com/Yivas/opencode-subagent-models/blob/main/SECURITY.md).
