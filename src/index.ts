import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { tool, type Config, type Plugin, type PluginModule } from "@opencode-ai/plugin"

type ModelState = { mode: "default" } | { mode: "forced"; model: string }

const configDirectory = process.env.XDG_CONFIG_HOME
  ? join(process.env.XDG_CONFIG_HOME, "opencode")
  : join(homedir(), ".config", "opencode")
const statePath = join(configDirectory, "subagent-model.json")

export function parseModelState(value: unknown): ModelState {
  if (!value || typeof value !== "object") return { mode: "default" }
  const state = value as Record<string, unknown>
  if (state.mode === "forced" && typeof state.model === "string" && /^[^/\s]+\/[^\s]+$/.test(state.model)) {
    return { mode: "forced", model: state.model }
  }
  return { mode: "default" }
}

async function readState(): Promise<ModelState> {
  try {
    return parseModelState(JSON.parse(await readFile(statePath, "utf8")))
  } catch {
    return { mode: "default" }
  }
}

async function saveState(model: string): Promise<ModelState> {
  const value = model.trim()
  const state: ModelState = value.toLowerCase() === "default"
    ? { mode: "default" }
    : parseModelState({ mode: "forced", model: value })

  if (value.toLowerCase() !== "default" && state.mode === "default") {
    throw new Error("Use 'default' or a model in provider/model format.")
  }

  await mkdir(configDirectory, { recursive: true })
  const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8")
    await rename(temporaryPath, statePath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
  return state
}

export function applyModelOverride(config: Config, state: ModelState): void {
  if (state.mode === "default") return
  for (const agent of Object.values(config.agent ?? {})) {
    if (agent.mode === "subagent") agent.model = state.model
  }
}

const server: Plugin = async () => ({
  config: async (config) => {
    config.command ??= {}
    config.command["subagents-model"] = {
      description: "Switch all subagents between their configured models and a shared model override.",
      agent: "build",
      template: `Configure the model used by all subagents. The supplied argument is: "$ARGUMENTS".

If the argument is empty, ask the user to choose "default" or enter a model in provider/model format. Then call subagent_model exactly once with that choice. If an argument is present, call subagent_model directly with that value. Make no other changes.`,
    }
    applyModelOverride(config, await readState())
  },
  tool: {
    subagent_model: tool({
      description: "Save a shared subagent model or restore each subagent's configured model.",
      args: {
        model: tool.schema.string().describe("'default' or a provider/model identifier"),
      },
      async execute({ model }, context) {
        if (context.agent !== "build") {
          throw new Error("Use /subagents-model; only the build agent can change this setting.")
        }
        await context.ask({
          permission: "subagent_model",
          patterns: [model],
          always: [],
          metadata: { model },
        })
        const state = await saveState(model)
        return state.mode === "default"
          ? "Default mode saved. Restart OpenCode to restore each subagent's configured model."
          : `Model ${state.model} saved for all subagents. Restart OpenCode to apply it.`
      },
    }),
  },
})

export default {
  id: "opencode-subagent-models",
  server,
} satisfies PluginModule & { id: string }
