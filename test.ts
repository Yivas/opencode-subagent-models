import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Config } from "@opencode-ai/plugin"

const temporaryRoot = await mkdtemp(join(tmpdir(), "opencode-subagent-models-"))
process.env.XDG_CONFIG_HOME = temporaryRoot

const { applyModelOverride, default: plugin, parseModelState } = await import("./src/index.ts")

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

try {
  const hooks = await plugin.server({} as never)
  const execute = hooks.tool?.subagent_model.execute
  assert.ok(execute)

  const pluginConfig = {} as Config
  await hooks.config?.(pluginConfig)
  assert.equal(
    pluginConfig.command?.["subagents-model"].description,
    "Switch all subagents between their configured models and a shared model override.",
  )
  assert.match(pluginConfig.command?.["subagents-model"].template ?? "", /^Configure the model used by all subagents/)

  let confirmed = false
  const result = await execute({ model: "openai/gpt-5" }, {
    agent: "build",
    ask: async () => { confirmed = true },
  } as never)

  assert.equal(confirmed, true)
  assert.match(result as string, /Model openai\/gpt-5 saved for all subagents/)
  assert.deepEqual(
    JSON.parse(await readFile(join(temporaryRoot, "opencode", "subagent-model.json"), "utf8")),
    { mode: "forced", model: "openai/gpt-5" },
  )
  assert.match(
    await execute({ model: "default" }, { agent: "build", ask: async () => {} } as never) as string,
    /Default mode saved/,
  )
  await assert.rejects(
    execute({ model: "invalid" }, { agent: "build", ask: async () => {} } as never),
    /provider\/model/,
  )
  await assert.rejects(
    execute({ model: "default" }, { agent: "orchestrator" } as never),
    /build agent/,
  )
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

console.log("ok")
