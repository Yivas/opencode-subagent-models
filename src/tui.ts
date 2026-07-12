import type { TuiDialogSelectOption, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { readState, saveState } from "./state.ts"

async function openSelector(api: TuiPluginApi) {
  const current = await readState()
  const options: TuiDialogSelectOption<string>[] = [
    {
      title: "Default",
      description: "Each subagent keeps its configured model",
      category: "Subagents",
      value: "default",
    },
  ]
  for (const provider of api.state.provider) {
    for (const model of Object.values(provider.models)) {
      options.push({
        title: model.name,
        description: `${provider.id}/${model.id}`,
        category: provider.name,
        value: `${provider.id}/${model.id}`,
      })
    }
  }

  // ponytail: DialogSelect called as a plain Solid component to avoid a JSX toolchain; props are static so this is safe
  api.ui.dialog.replace(() =>
    api.ui.DialogSelect({
      title: "Subagent model",
      placeholder: "Select a model for all subagents",
      options,
      current: current.mode === "forced" ? current.model : "default",
      onSelect: (option) => {
        api.ui.dialog.clear()
        saveState(option.value)
          .then((state) => {
            api.ui.toast({
              variant: "success",
              message: state.mode === "default"
                ? "Subagent models restored. Restart OpenCode to apply."
                : `Subagents will use ${state.model}. Restart OpenCode to apply.`,
            })
          })
          .catch((error: Error) => {
            api.ui.toast({ variant: "error", message: error.message })
          })
      },
    }),
  )
}

const tui = async (api: TuiPluginApi) => {
  // ponytail: legacy api.command bridge; move to api.keymap.registerLayer when the v1 shim is removed
  const dispose = api.command?.register(() => [
    {
      title: "Change subagent model",
      value: "subagent_models.select",
      description: "Force one model for all subagents or restore their defaults",
      category: "Models",
      slash: { name: "subagents-model" },
      onSelect: () => {
        void openSelector(api)
      },
    },
  ])
  if (dispose) api.lifecycle.onDispose(dispose)
}

export default {
  id: "opencode-subagent-models",
  tui,
} satisfies TuiPluginModule & { id: string }
