import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Config } from "@opencode-ai/plugin"

const temporaryRoot = await mkdtemp(join(tmpdir(), "opencode-subagent-models-"))
process.env.XDG_CONFIG_HOME = temporaryRoot

const { applyModelOverride, default: plugin, parseModelState } = await import("./src/index.ts")
const { readState, saveState } = await import("./src/state.ts")
const { default: tuiPlugin } = await import("./src/tui.ts")

assert.deepEqual(parseModelState(null), { mode: "default" })
assert.deepEqual(parseModelState({ mode: "forced", model: "openai/gpt-5" }), {
  mode: "forced",
  model: "openai/gpt-5",
})
assert.deepEqual(parseModelState({ mode: "forced", model: "invalid" }), { mode: "default" })

const config = {
  agent: {
    worker: { mode: "subagent", model: "anthropic/worker" },
    primary: { mode: "primary", model: "openai/primary" },
    shared: { mode: "all", model: "google/shared" },
  },
} as Config

const untouched = structuredClone(config)
applyModelOverride(untouched, { mode: "default" })
assert.deepEqual(untouched, config)

applyModelOverride(config, { mode: "forced", model: "openai/forced" })
assert.equal(config.agent?.worker.model, "openai/forced")
assert.equal(config.agent?.primary.model, "openai/primary")
assert.equal(config.agent?.shared.model, "google/shared")
assert.equal(config.agent?.general.model, "openai/forced")
assert.equal(config.agent?.explore.model, "openai/forced")

assert.equal(typeof plugin.server, "function")
assert.equal(typeof tuiPlugin.tui, "function")

try {
  assert.deepEqual(await saveState("openai/gpt-5"), { mode: "forced", model: "openai/gpt-5" })
  assert.deepEqual(
    JSON.parse(await readFile(join(temporaryRoot, "opencode", "subagent-model.json"), "utf8")),
    { mode: "forced", model: "openai/gpt-5" },
  )
  assert.deepEqual(await readState(), { mode: "forced", model: "openai/gpt-5" })

  const overridden = { agent: { worker: { mode: "subagent", model: "anthropic/worker" } } } as Config
  const hooks = await plugin.server({} as never)
  await hooks.config?.(overridden)
  assert.equal(overridden.agent?.worker.model, "openai/gpt-5")

  assert.deepEqual(await saveState("default"), { mode: "default" })
  assert.deepEqual(await readState(), { mode: "default" })

  await assert.rejects(saveState("invalid"), /provider\/model/)
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

console.log("ok")
