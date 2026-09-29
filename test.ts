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

// The host accepts a default export only when it carries an id and a setup
// function, so a future contract change must fail here instead of at load time.
assert.equal(typeof plugin.id, "string")
assert.equal(plugin.id.length > 0, true)
assert.equal(typeof plugin.setup, "function")
assert.equal(typeof tuiPlugin.id, "string")
assert.equal(tuiPlugin.id.length > 0, true)
assert.equal(typeof tuiPlugin.setup, "function")

type ModelRef = { id: string; providerID: string; variant?: string }
type SessionRecord = { parentID?: string; model?: ModelRef }
type CatalogModel = { id: string; providerID: string; variants?: string[]; enabled?: boolean }

type ToolHookEvent = { tool: string; sessionID: string; input: unknown }
type PromptHookEvent = { sessionID: string }

function createServerPlugin(options: {
  sessions?: Record<string, SessionRecord>
  models?: CatalogModel[]
  failSessionGet?: boolean
}) {
  const toolHooks: Array<(event: ToolHookEvent) => Promise<void> | void> = []
  const promptHooks: Array<(event: PromptHookEvent) => Promise<void> | void> = []
  const switches: Array<{ sessionID: string; model: ModelRef }> = []
  const sessions = options.sessions ?? {}
  const context = {
    tool: {
      hook: async (name: string, handler: (event: ToolHookEvent) => Promise<void> | void) => {
        assert.equal(name, "execute.before")
        toolHooks.push(handler)
        return { dispose: async () => {} }
      },
    },
    session: {
      hook: async (name: string, handler: (event: PromptHookEvent) => Promise<void> | void) => {
        assert.equal(name, "prompt")
        promptHooks.push(handler)
        return { dispose: async () => {} }
      },
      get: async ({ sessionID }: { sessionID: string }) => {
        if (options.failSessionGet) throw new Error("Parent lookup failed.")
        const record = sessions[sessionID] ?? {}
        return { id: sessionID, parentID: record.parentID, model: record.model }
      },
      switchModel: async ({ sessionID, model }: { sessionID: string; model: ModelRef }) => {
        switches.push({ sessionID, model })
      },
    },
    model: {
      list: async () => ({
        location: {},
        data: (options.models ?? []).map((model) => ({
          id: model.id,
          providerID: model.providerID,
          enabled: model.enabled ?? true,
          variants: (model.variants ?? []).map((id) => ({ id })),
        })),
      }),
    },
  }
  return { context, toolHooks, promptHooks, switches }
}

type ServerPluginDouble = ReturnType<typeof createServerPlugin>

async function startServerPlugin(double: ServerPluginDouble) {
  await plugin.setup(double.context as never)
}

async function runToolHook(double: ServerPluginDouble, sessionID: string, input: Record<string, unknown>) {
  const handler = double.toolHooks[0]
  assert.ok(handler)
  await handler({ tool: "subagent", sessionID, input })
  return input
}

async function runPromptHook(double: ServerPluginDouble, sessionID: string) {
  const handler = double.promptHooks[0]
  assert.ok(handler)
  await handler({ sessionID })
}

const catalog: CatalogModel[] = [
  { id: "gpt-5", providerID: "openai", variants: ["high"] },
  { id: "claude-opus", providerID: "anthropic", variants: ["max"] },
  { id: "gpt-5-mini", providerID: "openai", enabled: false },
]

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

  // Every failure below must leave the tool input alone: a broken lookup, a
  // broken ancestor state and a broken global state all degrade to the host.
  const failingPlugin = createServerPlugin({ failSessionGet: true })
  const stateFailurePlugin = createServerPlugin({ sessions: { child: { parentID: "root-corrupt" } } })
  const globalStateFailurePlugin = createServerPlugin({ sessions: { child: { parentID: "root-missing" } } })
  await startServerPlugin(failingPlugin)
  await startServerPlugin(stateFailurePlugin)
  await startServerPlugin(globalStateFailurePlugin)

  const originalWarn = console.warn
  const warnings: string[] = []
  console.warn = (message) => warnings.push(String(message))
  try {
    await writeFile(join(temporaryRoot, "opencode", "subagent-model.json"), "{", "utf8")
    for (const double of [failingPlugin, stateFailurePlugin, globalStateFailurePlugin]) {
      const input = await runToolHook(double, "child", { agent: "explore", prompt: "task" })
      assert.deepEqual(input, { agent: "explore", prompt: "task" })
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

  const overridePlugin = createServerPlugin({
    sessions: { child: { parentID: "root-one" }, "root-one": {} },
    models: catalog,
  })
  await startServerPlugin(overridePlugin)

  // The closest ancestor with a saved state wins.
  assert.equal(
    (await runToolHook(overridePlugin, "child", { agent: "explore" })).model,
    "anthropic/claude-opus#max",
  )

  // A cleared ancestor state falls back to the global state.
  await saveSessionState("root-one", "default")
  assert.equal((await runToolHook(overridePlugin, "child", { agent: "explore" })).model, "openai/gpt-5#high")

  // A root session delegates with its own model.
  assert.equal((await runToolHook(overridePlugin, "root-one", { agent: "explore" })).model, undefined)

  // A default state is the absence of an override, so the model the delegating
  // agent sent must reach the subagent untouched.
  await saveState("default")
  const defaultedInput = await runToolHook(overridePlugin, "child", { agent: "explore", model: "openai/gpt-5" })
  assert.equal(defaultedInput.model, "openai/gpt-5")

  // No saved global state resolves to the same no-override path.
  await rm(join(temporaryRoot, "opencode", "subagent-model.json"), { force: true })
  const statelessInput = await runToolHook(overridePlugin, "child", { agent: "explore", model: "openai/gpt-5" })
  assert.equal(statelessInput.model, "openai/gpt-5")

  // A model the catalog cannot apply - unknown, unknown variant or disabled - is
  // not written at all, so the delegated model survives and the host never
  // rejects the tool input.
  const droppedWarnings: string[] = []
  console.warn = (message) => droppedWarnings.push(String(message))
  try {
    await saveState("openai/removed")
    assert.equal((await runToolHook(overridePlugin, "child", { agent: "explore" })).model, undefined)
    await saveState("openai/gpt-5", "missing")
    assert.equal((await runToolHook(overridePlugin, "child", { agent: "explore" })).model, undefined)
    await saveState("openai/gpt-5-mini")
    assert.equal(
      (await runToolHook(overridePlugin, "child", { agent: "explore", model: "anthropic/claude-opus" })).model,
      "anthropic/claude-opus",
    )
  } finally {
    console.warn = originalWarn
  }
  assert.deepEqual(droppedWarnings, [
    "Could not resolve the subagent model override; using the configured model.",
    "Could not resolve the subagent model override; using the configured model.",
    "Could not resolve the subagent model override; using the configured model.",
  ])

  const promptPlugin = createServerPlugin({
    sessions: {
      root: {},
      "child-matching": { parentID: "root", model: { id: "gpt-5", providerID: "openai", variant: "high" } },
      "child-stale": { parentID: "root", model: { id: "gpt-5", providerID: "openai" } },
    },
    models: [{ id: "gpt-5", providerID: "openai", variants: ["high"] }],
  })
  await startServerPlugin(promptPlugin)

  await saveState("default")
  await runPromptHook(promptPlugin, "root")
  assert.deepEqual(promptPlugin.switches, [])
  await runPromptHook(promptPlugin, "child-stale")
  assert.deepEqual(promptPlugin.switches, [])

  await saveState("openai/gpt-5", "high")
  await runPromptHook(promptPlugin, "child-matching")
  assert.deepEqual(promptPlugin.switches, [])
  await runPromptHook(promptPlugin, "child-stale")
  assert.deepEqual(promptPlugin.switches, [
    { sessionID: "child-stale", model: { providerID: "openai", id: "gpt-5", variant: "high" } },
  ])

  type TuiCommand = {
    id?: string
    slash?: { name: string }
    run?: (input?: string) => void | false | Promise<void>
  }
  type TuiDialogOption = { title: string; description?: string; category?: string; value: unknown }
  type TuiDialogRequest = { title: string; placeholder?: string; options: TuiDialogOption[]; current?: unknown }

  function createTuiPlugin(options: {
    route: () => unknown
    models?: Array<{ id: string; providerID: string; name: string; variants?: string[] }>
    providers?: Array<{ id: string; name: string }>
  }) {
    const dialogs: TuiDialogRequest[] = []
    const answers: unknown[] = []
    const toasts: Array<{ variant: string; message: string }> = []
    let commands: TuiCommand[] | undefined
    let slotRender: (() => unknown) | undefined
    const context = {
      keymap: {
        layer: (input: () => { commands?: TuiCommand[] }) => {
          commands = input().commands
        },
      },
      ui: {
        slot: (claim: { render: () => unknown }) => {
          slotRender = claim.render
          return () => {}
        },
        dialog: {
          select: async (request: TuiDialogRequest) => {
            dialogs.push(request)
            return answers.shift()
          },
        },
        toast: {
          show: (toast: { variant: string; message: string }) => {
            toasts.push(toast)
          },
        },
        router: { current: options.route },
      },
      client: {
        model: {
          list: async () => ({
            location: {},
            data: (options.models ?? []).map((model) => ({
              id: model.id,
              providerID: model.providerID,
              name: model.name,
              variants: (model.variants ?? []).map((id) => ({ id })),
            })),
          }),
        },
        provider: { list: async () => ({ location: {}, data: options.providers ?? [] }) },
      },
    }
    return { context, dialogs, answers, toasts, getCommands: () => commands, getSlotRender: () => slotRender }
  }

  let route: unknown = { type: "session", sessionID: "root-ui" }
  const tui = createTuiPlugin({
    route: () => route,
    providers: [
      { id: "zeta", name: "Zeta" },
      { id: "openai", name: "OpenAI" },
    ],
    models: [
      { id: "small", providerID: "zeta", name: "Small" },
      { id: "gpt-5", providerID: "openai", name: "GPT-5", variants: ["high"] },
    ],
  })

  await tuiPlugin.setup(tui.context as never)
  const render = tui.getSlotRender()
  assert.ok(render)
  render()
  const commands = tui.getCommands()
  assert.ok(commands)
  assert.deepEqual(commands.map((command) => [command.id, command.slash?.name]), [
    ["subagent_models.global", "subagents-model"],
    ["subagent_models.session", "subagents-model-session"],
  ])

  const globalCommand = commands[0]
  assert.ok(globalCommand)
  tui.answers.push({ kind: "model", id: "openai/gpt-5", variants: ["high"] }, { kind: "variant", name: "high" })
  await globalCommand.run?.()
  assert.equal(tui.dialogs[0].title, "Global subagent model")
  assert.deepEqual(tui.dialogs[0].options.map((option) => option.title), ["Default", "GPT-5", "Small"])
  assert.deepEqual(tui.dialogs[0].options.map((option) => option.category), [
    "Default",
    "OpenAI (openai)",
    "Zeta (zeta)",
  ])
  assert.equal(tui.dialogs[1].title, "Reasoning variant")
  assert.deepEqual(tui.dialogs[1].options.map((option) => option.title), ["Default", "high"])
  assert.deepEqual(await readState(), { mode: "forced", model: "openai/gpt-5", variant: "high" })
  assert.deepEqual(tui.toasts.at(-1), {
    variant: "success",
    message: "Global subagents will use openai/gpt-5 (high).",
  })

  const sessionCommand = commands[1]
  assert.ok(sessionCommand)
  tui.answers.push({ kind: "default" })
  await sessionCommand.run?.()
  assert.equal(tui.dialogs[2].title, "Session subagent model")
  assert.deepEqual(await readSessionState("root-ui"), { mode: "default" })

  // Closing a dialog without choosing leaves the saved state untouched.
  await saveSessionState("root-ui", "zeta/small")
  const dialogsBeforeCancel = tui.dialogs.length
  await sessionCommand.run?.()
  assert.equal(tui.dialogs.length, dialogsBeforeCancel + 1)
  assert.deepEqual(await readSessionState("root-ui"), { mode: "forced", model: "zeta/small" })

  route = { type: "home" }
  await sessionCommand.run?.()
  assert.deepEqual(tui.toasts.at(-1), { variant: "warning", message: "Open a session first." })

  route = { type: "session", sessionID: "../invalid" }
  await sessionCommand.run?.()
  assert.deepEqual(tui.toasts.at(-1), {
    variant: "error",
    message: "Could not read the saved subagent model state.",
  })

  route = { type: "session", sessionID: "root-ui" }
  const globalStatePath = join(temporaryRoot, "opencode", "subagent-model.json")
  await rm(globalStatePath, { force: true })
  await mkdir(globalStatePath)
  await globalCommand.run?.()
  assert.equal(tui.toasts.at(-1)?.variant, "error")
  await rm(globalStatePath, { recursive: true, force: true })
  await saveState("default")

  await assert.rejects(saveState("invalid"), /provider\/model/)
  await assert.rejects(saveSessionState("../escape", "openai/gpt-5"), /session ID/)
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

console.log("ok")
