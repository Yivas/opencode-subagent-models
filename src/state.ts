import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export type ModelState = { mode: "default" } | { mode: "forced"; model: string }

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

export async function readState(): Promise<ModelState> {
  try {
    return parseModelState(JSON.parse(await readFile(statePath, "utf8")))
  } catch {
    return { mode: "default" }
  }
}

export async function saveState(model: string): Promise<ModelState> {
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
