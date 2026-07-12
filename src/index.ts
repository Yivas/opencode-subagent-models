import type { Plugin, PluginModule } from "@opencode-ai/plugin"
import { readSessionOverride, readState, type ModelState } from "./state.ts"

export { parseModelState } from "./state.ts"

export async function findSessionOverride(
  sessionID: string,
  getParentID: (id: string) => Promise<string | undefined>,
): Promise<ModelState | undefined> {
  let parentID = await getParentID(sessionID)
  if (!parentID) return undefined
  while (parentID) {
    const state = await readSessionOverride(parentID)
    if (state) return state.mode === "forced" ? state : readState()
    parentID = await getParentID(parentID)
  }
  return readState()
}

const server: Plugin = async ({ client, directory }) => ({
  "chat.message": async (input, output) => {
    const state = await findSessionOverride(input.sessionID, async (id) => {
      const response = await client.session.get({ path: { id }, query: { directory } })
      return response.data?.parentID
    })
    if (!state || state.mode === "default") return

    const separator = state.model.indexOf("/")
    const model = output.message.model as typeof output.message.model & { variant?: string }
    model.providerID = state.model.slice(0, separator)
    model.modelID = state.model.slice(separator + 1)
    if (state.variant) model.variant = state.variant
    else delete model.variant
  },
})

export default {
  id: "opencode-subagent-models",
  server,
} satisfies PluginModule & { id: string }
