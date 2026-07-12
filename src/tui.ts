import type { TuiDialogSelectOption, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { readSessionState, readState, saveSessionState, saveState, type ModelState } from "./state.ts"

type SelectedModel = {
  id: string
  variants: string[]
}

type VariantChoice = { kind: "model-default" } | { kind: "variant"; name: string }

type SelectionScope = {
  label: "Global" | "Session"
  read: () => Promise<ModelState>
  save: (model: string, variant?: string) => Promise<ModelState>
}

function saveSelection(api: TuiPluginApi, scope: SelectionScope, model: string, variant?: string) {
  api.ui.dialog.clear()
  scope.save(model, variant)
    .then((state) => {
      api.ui.toast({
        variant: "success",
        message: state.mode === "default"
          ? `${scope.label} subagent override cleared.`
          : `${scope.label} subagents will use ${state.model}${state.variant ? ` (${state.variant})` : ""}.`,
      })
    })
    .catch((error: Error) => {
      api.ui.toast({ variant: "error", message: error.message })
    })
}

function openVariantSelector(
  api: TuiPluginApi,
  scope: SelectionScope,
  model: SelectedModel,
  currentVariant?: string,
) {
  const options: TuiDialogSelectOption<VariantChoice>[] = [
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

  api.ui.dialog.replace(() =>
    api.ui.DialogSelect({
      title: "Reasoning variant",
      placeholder: "Search variants",
      options,
      current: options.find((option) => option.value.kind === "variant" && option.value.name === currentVariant)?.value
        ?? options[0].value,
      onSelect: (option) => saveSelection(
        api,
        scope,
        model.id,
        option.value.kind === "variant" ? option.value.name : undefined,
      ),
    }),
  )
}

async function openSelector(api: TuiPluginApi, scope: SelectionScope) {
  const current = await scope.read()
  const options: TuiDialogSelectOption<SelectedModel | "default">[] = [
    {
      title: "Default",
      description: scope.label === "Global"
        ? "Restore each subagent's configuration"
        : "Inherit the global subagent model",
      category: "Default",
      value: "default",
    },
  ]
  for (const provider of [...api.state.provider].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const model of Object.values(provider.models).sort((a, b) => a.name.localeCompare(b.name))) {
      options.push({
        title: model.name,
        description: `${provider.id}/${model.id}`,
        category: provider.name === provider.id ? provider.id : `${provider.name} (${provider.id})`,
        value: {
          id: `${provider.id}/${model.id}`,
          variants: Object.keys(model.variants ?? {}),
        },
      })
    }
  }

  // ponytail: DialogSelect called as a plain Solid component to avoid a JSX toolchain; props are static so this is safe
  api.ui.dialog.replace(() =>
    api.ui.DialogSelect({
      title: `${scope.label} subagent model`,
      placeholder: "Search models",
      options,
      current: current.mode === "forced"
        ? options.find((option) => option.value !== "default" && option.value.id === current.model)?.value
        : "default",
      onSelect: (option) => {
        if (option.value === "default") return saveSelection(api, scope, "default")
        openVariantSelector(api, scope, option.value, current.mode === "forced" && current.model === option.value.id
          ? current.variant
          : undefined)
      },
    }),
  )
}

const tui = async (api: TuiPluginApi) => {
  // ponytail: legacy api.command bridge; move to api.keymap.registerLayer when the v1 shim is removed
  const dispose = api.command?.register(() => [
    {
      title: "Global subagent model",
      value: "subagent_models.global",
      description: "Set default for all sessions",
      category: "Agent",
      slash: { name: "subagents-model" },
      onSelect: () => {
        void openSelector(api, { label: "Global", read: readState, save: saveState })
      },
    },
    {
      title: "Session subagent model",
      value: "subagent_models.session",
      description: "Override the current session",
      category: "Agent",
      slash: { name: "subagents-model-session" },
      onSelect: () => {
        const route = api.route.current
        const sessionID = "params" in route ? route.params?.sessionID : undefined
        if (typeof sessionID !== "string") {
          api.ui.toast({ variant: "warning", message: "Open a session first." })
          return
        }
        void openSelector(api, {
          label: "Session",
          read: () => readSessionState(sessionID),
          save: (model, variant) => saveSessionState(sessionID, model, variant),
        })
      },
    },
  ])
  if (dispose) api.lifecycle.onDispose(dispose)
}

export default {
  id: "opencode-subagent-models",
  tui,
} satisfies TuiPluginModule & { id: string }
