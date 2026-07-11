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
    throw new Error("Usa 'default' o un modelo con formato provider/model.")
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
      description: "Cambia todos los subagentes entre sus modelos por defecto y un modelo comun.",
      agent: "build",
      template: `Configura el modelo de todos los subagentes. El argumento recibido es: "$ARGUMENTS".

Si el argumento esta vacio, pregunta al usuario si quiere "default" o un modelo con formato provider/model. Despues llama exactamente una vez a subagent_model con la eleccion. Si hay argumento, llama directamente a subagent_model con ese valor. No hagas ningun otro cambio.`,
    }
    applyModelOverride(config, await readState())
  },
  tool: {
    subagent_model: tool({
      description: "Guarda el modelo comun de los subagentes o restaura sus modelos por defecto.",
      args: {
        model: tool.schema.string().describe("'default' o un identificador provider/model"),
      },
      async execute({ model }, context) {
        if (context.agent !== "build") {
          throw new Error("Usa /subagents-model; este ajuste solo puede ejecutarse con el agente build.")
        }
        await context.ask({
          permission: "subagent_model",
          patterns: [model],
          always: [],
          metadata: { model },
        })
        const state = await saveState(model)
        return state.mode === "default"
          ? "Modo default guardado. Reinicia OpenCode para restaurar el modelo propio de cada subagente."
          : `Modelo ${state.model} guardado para todos los subagentes. Reinicia OpenCode para aplicarlo.`
      },
    }),
  },
})

export default {
  id: "opencode-subagent-models",
  server,
} satisfies PluginModule & { id: string }
