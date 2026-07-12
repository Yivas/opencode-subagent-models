import type { Config, Plugin, PluginModule } from "@opencode-ai/plugin"
import { readState, type ModelState } from "./state.ts"

export { parseModelState } from "./state.ts"

// ponytail: built-in subagents are absent from the merged config; extend when OpenCode ships more
const BUILTIN_SUBAGENTS = ["general", "explore", "scout"]

export function applyModelOverride(config: Config, state: ModelState): void {
  if (state.mode === "default") return
  config.agent ??= {}
  for (const name of BUILTIN_SUBAGENTS) {
    const agent = (config.agent[name] ??= { mode: "subagent" })
    agent.mode ??= "subagent"
  }
  for (const agent of Object.values(config.agent)) {
    if (agent.mode === "subagent") agent.model = state.model
  }
}

const server: Plugin = async () => ({
  config: async (config) => {
    applyModelOverride(config, await readState())
  },
})

export default {
  id: "opencode-subagent-models",
  server,
} satisfies PluginModule & { id: string }
