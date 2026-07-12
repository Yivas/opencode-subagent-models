import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export type ModelState = { mode: "default" } | { mode: "forced"; model: string; variant?: string }

const configDirectory = process.env.XDG_CONFIG_HOME
  ? join(process.env.XDG_CONFIG_HOME, "opencode")
  : join(homedir(), ".config", "opencode")
const statePath = join(configDirectory, "subagent-model.json")
const sessionStateDirectory = join(configDirectory, "subagent-models")

export function parseModelState(value: unknown): ModelState {
  if (!value || typeof value !== "object") return { mode: "default" }
  const state = value as Record<string, unknown>
  if (state.mode === "forced" && typeof state.model === "string" && /^[^/\s]+\/[^\s]+$/.test(state.model)) {
    return {
      mode: "forced",
      model: state.model,
      ...(typeof state.variant === "string" && state.variant.trim() ? { variant: state.variant.trim() } : {}),
    }
  }
  return { mode: "default" }
}

async function readOptionalModelState(path: string): Promise<ModelState | undefined> {
  try {
    return parseModelState(JSON.parse(await readFile(path, "utf8")))
  } catch {
    return undefined
  }
}

async function readModelState(path: string): Promise<ModelState> {
  return await readOptionalModelState(path) ?? { mode: "default" }
}

function createModelState(model: string, variant?: string): ModelState {
  const value = model.trim()
  const state: ModelState = value.toLowerCase() === "default"
    ? { mode: "default" }
    : parseModelState({ mode: "forced", model: value, variant })

  if (value.toLowerCase() !== "default" && state.mode === "default") {
    throw new Error("Use 'default' or a model in provider/model format.")
  }
  return state
}

async function writeModelState(path: string, state: ModelState): Promise<void> {
  await mkdir(configDirectory, { recursive: true })
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8")
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

function sessionStatePath(sessionID: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(sessionID)) throw new Error("Invalid session ID.")
  return join(sessionStateDirectory, `${sessionID}.json`)
}

export function readState(): Promise<ModelState> {
  return readModelState(statePath)
}

export async function saveState(model: string, variant?: string): Promise<ModelState> {
  const state = createModelState(model, variant)
  await writeModelState(statePath, state)
  return state
}

export function readSessionState(sessionID: string): Promise<ModelState> {
  return readModelState(sessionStatePath(sessionID))
}

export function readSessionOverride(sessionID: string): Promise<ModelState | undefined> {
  return readOptionalModelState(sessionStatePath(sessionID))
}

export async function saveSessionState(sessionID: string, model: string, variant?: string): Promise<ModelState> {
  const path = sessionStatePath(sessionID)
  const state = createModelState(model, variant)
  await mkdir(sessionStateDirectory, { recursive: true })
  await writeModelState(path, state)
  return state
}
