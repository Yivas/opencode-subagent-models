import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
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

  const sessionStateDirectory = join(temporaryRoot, "opencode", "subagent-models")
  await mkdir(sessionStateDirectory, { recursive: true })
  await writeFile(join(sessionStateDirectory, "root-corrupt.json"), "{", "utf8")
  await writeFile(join(sessionStateDirectory, "root-invalid.json"), JSON.stringify({ mode: "forced", model: "invalid" }), "utf8")
  await writeFile(
    join(sessionStateDirectory, "root-invalid-variant.json"),
    JSON.stringify({ mode: "forced", model: "openai/gpt-5", variant: 42 }),
    "utf8",
  )
  await mkdir(join(sessionStateDirectory, "root-unreadable.json"))
  for (const rootID of ["root-corrupt", "root-invalid", "root-invalid-variant", "root-unreadable"]) {
    await assert.rejects(
      findSessionOverride(
        `${rootID}-child`,
        async (id) => id === `${rootID}-child` ? rootID : undefined,
      ),
      /state/i,
    )
  }

  let cycleLookups = 0
  await assert.rejects(
    findSessionOverride("cycle-a", async (id) => {
      cycleLookups++
      if (cycleLookups > 4) throw new Error("Parent lookup limit exceeded.")
      return id === "cycle-a" ? "cycle-b" : "cycle-a"
    }),
    /cycle/i,
  )

  const failingHooks = await plugin.server({
    client: {
      session: {
        get: async () => { throw new Error("Parent lookup failed.") },
      },
    },
    directory: temporaryRoot,
  } as never)
  const stateFailureHooks = await plugin.server({
    client: {
      session: {
        get: async () => ({ data: { parentID: "root-corrupt" } }),
      },
    },
    directory: temporaryRoot,
  } as never)
  const globalStateFailureHooks = await plugin.server({
    client: {
      session: {
        get: async ({ path }: { path: { id: string } }) => ({
          data: { parentID: path.id === "global-state-failure" ? "root-missing" : undefined },
        }),
      },
    },
    directory: temporaryRoot,
  } as never)
  const originalWarn = console.warn
  const warnings: string[] = []
  console.warn = (message) => warnings.push(String(message))
  try {
    await writeFile(join(temporaryRoot, "opencode", "subagent-model.json"), "{", "utf8")
    for (const [sessionID, activeHooks] of [
      ["lookup-failure", failingHooks],
      ["state-failure", stateFailureHooks],
      ["global-state-failure", globalStateFailureHooks],
    ] as const) {
      const fallbackMessage = { model: { providerID: "anthropic", modelID: "configured" } }
      await activeHooks["chat.message"]?.(
        { sessionID },
        { message: fallbackMessage, parts: [] } as never,
      )
      assert.deepEqual(fallbackMessage.model, { providerID: "anthropic", modelID: "configured" })
    }
  } finally {
    console.warn = originalWarn
  }
  assert.deepEqual(warnings, [
    "Could not resolve the subagent model override; using the configured model.",
    "Could not resolve the subagent model override; using the configured model.",
    "Could not resolve the subagent model override; using the configured model.",
  ])
  await saveState("openai/gpt-5", "high")

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

  type CapturedOption = {
    title: string
    description?: string
    category?: string
    value: unknown
  }
  type CapturedDialog = {
    title: string
    options: CapturedOption[]
    onSelect?: (option: CapturedOption) => unknown
  }
  type CapturedCommand = {
    value: string
    slash?: { name: string }
    onSelect?: () => unknown
  }

  let commandFactory: (() => CapturedCommand[]) | undefined
  let currentDialog: CapturedDialog | undefined
  let currentRoute: { params?: { sessionID?: string } } = { params: { sessionID: "root-ui" } }
  let disposePlugin: (() => void | Promise<void>) | undefined
  let disposed = false
  let clearedDialogs = 0
  const toasts: Array<{ variant: string; message: string }> = []
  const tuiApi = {
    command: {
      register: (factory: () => CapturedCommand[]) => {
        commandFactory = factory
        return () => { disposed = true }
      },
    },
    lifecycle: {
      onDispose: (dispose: () => void | Promise<void>) => {
        disposePlugin = dispose
        return () => {}
      },
    },
    route: {
      get current() { return currentRoute },
    },
    state: {
      provider: [
        {
          id: "zeta",
          name: "Zeta",
          models: { small: { id: "small", name: "Small", variants: {} } },
        },
        {
          id: "openai",
          name: "OpenAI",
          models: { "gpt-5": { id: "gpt-5", name: "GPT-5", variants: { high: {} } } },
        },
      ],
    },
    ui: {
      dialog: {
        clear: () => { clearedDialogs++ },
        replace: (render: () => unknown) => { render() },
      },
      DialogSelect: (props: CapturedDialog) => {
        currentDialog = props
        return props
      },
      toast: (toast: { variant: string; message: string }) => { toasts.push(toast) },
    },
  }

  await tuiPlugin.tui(tuiApi as never)
  const commands = commandFactory?.()
  assert.ok(commands)
  assert.deepEqual(commands.map((command) => [command.value, command.slash?.name]), [
    ["subagent_models.global", "subagents-model"],
    ["subagent_models.session", "subagents-model-session"],
  ])

  const globalCommand = commands[0]
  assert.ok(globalCommand)
  await globalCommand.onSelect?.()
  assert.equal(currentDialog?.title, "Global subagent model")
  assert.deepEqual(currentDialog?.options.map((option) => option.title), ["Default", "GPT-5", "Small"])
  assert.deepEqual(currentDialog?.options.map((option) => option.category), ["Default", "OpenAI (openai)", "Zeta (zeta)"])

  const globalModelOption = currentDialog?.options.find((option) => option.description === "openai/gpt-5")
  assert.ok(globalModelOption)
  await currentDialog?.onSelect?.(globalModelOption)
  assert.equal(currentDialog?.title, "Reasoning variant")
  assert.deepEqual(currentDialog?.options.map((option) => option.title), ["Default", "high"])
  const highVariant = currentDialog?.options.find((option) => option.title === "high")
  assert.ok(highVariant)
  await currentDialog?.onSelect?.(highVariant)
  assert.deepEqual(await readState(), { mode: "forced", model: "openai/gpt-5", variant: "high" })
  assert.deepEqual(toasts.at(-1), {
    variant: "success",
    message: "Global subagents will use openai/gpt-5 (high).",
  })

  const sessionCommand = commands[1]
  assert.ok(sessionCommand)
  await sessionCommand.onSelect?.()
  assert.equal(currentDialog?.title, "Session subagent model")
  const sessionDefault = currentDialog?.options[0]
  assert.ok(sessionDefault)
  await currentDialog?.onSelect?.(sessionDefault)
  assert.deepEqual(await readSessionState("root-ui"), { mode: "default" })

  currentRoute = {}
  await sessionCommand.onSelect?.()
  assert.deepEqual(toasts.at(-1), { variant: "warning", message: "Open a session first." })

  currentRoute = { params: { sessionID: "../invalid" } }
  await sessionCommand.onSelect?.()
  assert.deepEqual(toasts.at(-1), {
    variant: "error",
    message: "Could not read the saved subagent model state.",
  })

  await globalCommand.onSelect?.()
  const failingModelOption = currentDialog?.options.find((option) => option.description === "openai/gpt-5")
  assert.ok(failingModelOption)
  await currentDialog?.onSelect?.(failingModelOption)
  const failingVariant = currentDialog?.options.find((option) => option.title === "high")
  assert.ok(failingVariant)
  const globalStatePath = join(temporaryRoot, "opencode", "subagent-model.json")
  await rm(globalStatePath, { force: true })
  await mkdir(globalStatePath)
  await currentDialog?.onSelect?.(failingVariant)
  assert.equal(toasts.at(-1)?.variant, "error")
  await rm(globalStatePath, { recursive: true, force: true })
  await saveState("default")

  assert.ok(clearedDialogs >= 3)
  await disposePlugin?.()
  assert.equal(disposed, true)

  await assert.rejects(saveState("invalid"), /provider\/model/)
  await assert.rejects(saveSessionState("../escape", "openai/gpt-5"), /session ID/)
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

console.log("ok")
