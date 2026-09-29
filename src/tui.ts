import { Plugin } from "@opencode/plugin/tui"
import type { Context, DialogSelectOption, KeymapCommand } from "@opencode/plugin/tui/context"
import { readSessionState, readState, saveSessionState, saveState, type ModelState } from "./state.ts"

type ModelChoice = { kind: "default" } | { kind: "model"; id: string; variants: string[] }

type VariantChoice = { kind: "model-default" } | { kind: "variant"; name: string }

type SelectionScope = {
  label: "Global" | "Session"
  read: () => Promise<ModelState>
  save: (model: string, variant?: string) => Promise<ModelState>
}

async function saveSelection(
  context: Context,
  scope: SelectionScope,
  model: string,
  variant?: string,
): Promise<void> {
  try {
    const state = await scope.save(model, variant)
    context.ui.toast.show({
      variant: "success",
      message: state.mode === "default"
        ? `${scope.label} subagent override cleared.`
        : `${scope.label} subagents will use ${state.model}${state.variant ? ` (${state.variant})` : ""}.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the subagent model override."
    context.ui.toast.show({ variant: "error", message })
  }
}

async function selectVariant(
  context: Context,
  scope: SelectionScope,
  model: Extract<ModelChoice, { kind: "model" }>,
  currentVariant?: string,
): Promise<void> {
  const options: DialogSelectOption<VariantChoice>[] = [
    {
      title: "Default",
      description: "Use the model's default reasoning",
      value: { kind: "model-default" },
    },
    ...model.variants.map((variant) => ({
      title: variant,
      value: { kind: "variant", name: variant } as const,
    })),
  ]

  const choice = await context.ui.dialog.select({
    title: "Reasoning variant",
    placeholder: "Search variants",
    options,
    current: options.find((option) => option.value.kind === "variant" && option.value.name === currentVariant)?.value
      ?? options[0].value,
  })
  if (!choice) return
  await saveSelection(context, scope, model.id, choice.kind === "variant" ? choice.name : undefined)
}

async function openSelector(context: Context, scope: SelectionScope): Promise<void> {
  const current = await scope.read()
  const [catalog, providers] = await Promise.all([context.client.model.list(), context.client.provider.list()])
  const providerNames = new Map(providers.data.map((provider) => [provider.id, provider.name]))
  const providerLabel = (providerID: string) => {
    const name = providerNames.get(providerID)
    return name && name !== providerID ? `${name} (${providerID})` : providerID
  }

  const options: DialogSelectOption<ModelChoice>[] = [
    {
      title: "Default",
      description: scope.label === "Global"
        ? "Restore each subagent's configuration"
        : "Inherit the global subagent model",
      category: "Default",
      value: { kind: "default" },
    },
  ]
  const models = [...catalog.data].sort(
    (left, right) =>
      providerLabel(left.providerID).localeCompare(providerLabel(right.providerID))
      || left.name.localeCompare(right.name),
  )
  for (const model of models) {
    options.push({
      title: model.name,
      description: `${model.providerID}/${model.id}`,
      category: providerLabel(model.providerID),
      value: {
        kind: "model",
        id: `${model.providerID}/${model.id}`,
        variants: model.variants.map((variant) => variant.id),
      },
    })
  }

  const currentModel = current.mode === "forced" ? current.model : undefined
  const currentVariant = current.mode === "forced" ? current.variant : undefined
  const selected = currentModel === undefined
    ? undefined
    : options.find((option) => option.value.kind === "model" && option.value.id === currentModel)?.value

  const choice = await context.ui.dialog.select({
    title: `${scope.label} subagent model`,
    placeholder: "Search models",
    options,
    current: selected ?? options[0].value,
  })
  if (!choice) return
  if (choice.kind === "default") {
    await saveSelection(context, scope, "default")
    return
  }
  await selectVariant(
    context,
    scope,
    choice,
    selected?.kind === "model" && selected.id === choice.id ? currentVariant : undefined,
  )
}

async function showSelector(context: Context, scope: SelectionScope): Promise<void> {
  try {
    await openSelector(context, scope)
  } catch {
    context.ui.toast.show({ variant: "error", message: "Could not read the saved subagent model state." })
  }
}

export default Plugin.define({
  id: "opencode-subagent-models",
  setup(context) {
    const commands: KeymapCommand[] = [
      {
        id: "subagent_models.global",
        title: "Global subagent model",
        description: "Set default for all sessions",
        group: "Agent",
        palette: true,
        slash: { name: "subagents-model" },
        run: () => showSelector(context, { label: "Global", read: readState, save: saveState }),
      },
      {
        id: "subagent_models.session",
        title: "Session subagent model",
        description: "Override the current session",
        group: "Agent",
        palette: true,
        slash: { name: "subagents-model-session" },
        run: () => {
          const route = context.ui.router.current()
          const sessionID = route.type === "session" ? route.sessionID : undefined
          if (typeof sessionID !== "string") {
            context.ui.toast.show({ variant: "warning", message: "Open a session first." })
            return
          }
          return showSelector(context, {
            label: "Session",
            read: () => readSessionState(sessionID),
            save: (model, variant) => saveSessionState(sessionID, model, variant),
          })
        },
      },
    ]

    // A keymap layer belongs to the component that renders it, so the commands
    // register from a slot render the host owns and disposes with the plugin.
    context.ui.slot({
      append: "app",
      render() {
        context.keymap.layer(() => ({ mode: "global", commands }))
        return null
      },
    })
  },
})
