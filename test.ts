import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const temporaryRoot = await mkdtemp(join(tmpdir(), "opencode-subagent-models-"))
process.env.XDG_CONFIG_HOME = temporaryRoot

const { default: plugin, findSessionOverride, parseModelState } = await import("./src/index.ts")
const { readSessionState, readState, saveSessionState, saveState } = await import("./src/state.ts")
const { default: tuiPlugin } = await import("./src/tui.ts")

assert.deepEqual(parseModelState(null), { mode: "default" })
assert.deepEqual(parseModelState({ mode: "forced", model: "openai/gpt-5" }), {
  mode: "forced",
  model: "openai/gpt-5",
})
assert.deepEqual(parseModelState({ mode: "forced", model: "openai/gpt-5", variant: "high" }), {
  mode: "forced",
  model: "openai/gpt-5",
  variant: "high",
})
assert.deepEqual(parseModelState({ mode: "forced", model: "openai/gpt-5", variant: "default" }), {
  mode: "forced",
  model: "openai/gpt-5",
  variant: "default",
})
assert.deepEqual(parseModelState({ mode: "forced", model: "invalid" }), { mode: "default" })

assert.equal(typeof plugin.server, "function")
assert.equal(typeof tuiPlugin.tui, "function")

try {
  assert.deepEqual(await saveState("openai/gpt-5", "high"), {
    mode: "forced",
    model: "openai/gpt-5",
    variant: "high",
  })
  assert.deepEqual(
    JSON.parse(await readFile(join(temporaryRoot, "opencode", "subagent-model.json"), "utf8")),
    { mode: "forced", model: "openai/gpt-5", variant: "high" },
  )
  assert.deepEqual(await readState(), { mode: "forced", model: "openai/gpt-5", variant: "high" })

  await saveSessionState("root-one", "anthropic/claude-opus", "max")
  assert.deepEqual(await readSessionState("root-one"), {
    mode: "forced",
    model: "anthropic/claude-opus",
    variant: "max",
  })
  assert.deepEqual(await readSessionState("root-two"), { mode: "default" })
  assert.deepEqual(
    await findSessionOverride("child", async (id) => ({ child: "root-one", "root-one": undefined })[id]),
    { mode: "forced", model: "anthropic/claude-opus", variant: "max" },
  )
  assert.equal(await findSessionOverride("root-one", async () => undefined), undefined)

  const client = {
    session: {
      get: async ({ path }: { path: { id: string } }) => ({
        data: { id: path.id, parentID: path.id === "child" ? "root-one" : undefined },
      }),
    },
  }
  const hooks = await plugin.server({ client, directory: temporaryRoot } as never)

  const message = { model: { providerID: "openai", modelID: "gpt-5" } }
  await hooks["chat.message"]?.(
    { sessionID: "child" },
    { message, parts: [] } as never,
  )
  assert.deepEqual(message.model, {
    providerID: "anthropic",
    modelID: "claude-opus",
    variant: "max",
  })

  assert.deepEqual(await saveSessionState("root-one", "default"), { mode: "default" })
  assert.deepEqual(await readSessionState("root-one"), { mode: "default" })

  await saveSessionState("root-one", "anthropic/claude-opus", "max")
  await saveSessionState("child", "default")
  assert.deepEqual(
    await findSessionOverride(
      "grandchild",
      async (id) => ({ grandchild: "child", child: "root-one", "root-one": undefined })[id],
    ),
    { mode: "forced", model: "openai/gpt-5", variant: "high" },
  )
  await saveSessionState("root-one", "default")

  const globalMessage = { model: { providerID: "anthropic", modelID: "original" } }
  await hooks["chat.message"]?.(
    { sessionID: "child" },
    { message: globalMessage, parts: [] } as never,
  )
  assert.deepEqual(globalMessage.model, {
    providerID: "openai",
    modelID: "gpt-5",
    variant: "high",
  })

  const primaryMessage = { model: { providerID: "anthropic", modelID: "primary" } }
  await hooks["chat.message"]?.(
    { sessionID: "root-one" },
    { message: primaryMessage, parts: [] } as never,
  )
  assert.deepEqual(primaryMessage.model, { providerID: "anthropic", modelID: "primary" })

  assert.deepEqual(await saveState("default"), { mode: "default" })
  assert.deepEqual(await readState(), { mode: "default" })

  const defaultMessage = { model: { providerID: "anthropic", modelID: "configured" } }
  await hooks["chat.message"]?.(
    { sessionID: "child" },
    { message: defaultMessage, parts: [] } as never,
  )
  assert.deepEqual(defaultMessage.model, { providerID: "anthropic", modelID: "configured" })

  await assert.rejects(saveState("invalid"), /provider\/model/)
  await assert.rejects(saveSessionState("../escape", "openai/gpt-5"), /session ID/)
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

console.log("ok")
