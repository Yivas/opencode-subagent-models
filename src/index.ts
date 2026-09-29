import { Plugin } from "@opencode/plugin"
import { readSessionOverride, readState, type ModelState } from "./state.ts"

export { parseModelState } from "./state.ts"

const SUBAGENT_TOOL = "subagent"
const OVERRIDE_FAILURE_WARNING = "Could not resolve the subagent model override; using the configured model."

type SessionLookup = (sessionID: string) => Promise<string | undefined>
type ForcedState = Extract<ModelState, { mode: "forced" }>
type ResolvedOverride = { providerID: string; id: string; variant?: string }

/**
 * Resolves the override that applies to a session by walking up from its
 * parent, so the closest ancestor with a saved state wins and the global state
 * is the last resort. Returns undefined for a root session: it has no override
 * to inherit, and the main session must stay untouched.
 */
export async function findSessionOverride(
  sessionID: string,
  getParentID: SessionLookup,
): Promise<ModelState | undefined> {
  const parentID = await getParentID(sessionID)
  if (!parentID) return undefined
  return await findAncestorOverride(sessionID, parentID, getParentID)
}

async function findAncestorOverride(
  childSessionID: string,
  parentID: string,
  getParentID: SessionLookup,
): Promise<ModelState> {
  // Seeded with the child so a chain that loops back to it is caught as well.
  const visitedSessionIDs = new Set([childSessionID])
  let currentID: string | undefined = parentID
  while (currentID) {
    if (visitedSessionIDs.has(currentID)) throw new Error("Session parent cycle detected.")
    visitedSessionIDs.add(currentID)

    const state = await readSessionOverride(currentID)
    if (state) return state.mode === "forced" ? state : readState()
    currentID = await getParentID(currentID)
  }
  return readState()
}

/**
 * Drops a saved override the catalog cannot apply. The host resolves the tool
 * input against its own available models and fails the subagent tool on an
 * unknown model, an unknown variant or a disabled model, so writing one would
 * break delegation; the override is applied whole or not at all.
 */
async function resolveCatalogModel(
  context: Plugin.Context,
  state: ForcedState,
): Promise<ResolvedOverride | undefined> {
  const separator = state.model.indexOf("/")
  const providerID = state.model.slice(0, separator)
  const modelID = state.model.slice(separator + 1)
  const catalog = await context.model.list()
  const model = catalog.data.find((item) => item.providerID === providerID && item.id === modelID)
  if (!model || !model.enabled) return undefined
  if (state.variant && !model.variants.some((variant) => variant.id === state.variant)) return undefined
  return { providerID, id: modelID, ...(state.variant ? { variant: state.variant } : {}) }
}

export default Plugin.define({
  id: "opencode-subagent-models",
  setup: async (context) => {
    const getParentID: SessionLookup = async (sessionID) => (await context.session.get({ sessionID })).parentID

    // The host resolves a child's model where it creates the session, so the
    // tool input is the only seam that can change a new subagent's model.
    await context.tool.hook("execute.before", async (event) => {
      if (event.tool !== SUBAGENT_TOOL) return
      if (typeof event.input !== "object" || event.input === null) return
      const input = event.input as Record<string, unknown>
      try {
        const state = await findSessionOverride(event.sessionID, getParentID)
        // Default is the absence of an override, not a rewrite. The 1.x plugin
        // only acted on an explicit selection, so a Default state leaves the
        // model the delegating agent asked for intact instead of dropping it.
        if (!state || state.mode === "default") return
        const model = await resolveCatalogModel(context, state)
        // An override the catalog cannot apply is not written: the host fails
        // the tool on it, so dropping it keeps the delegation working.
        if (!model) {
          console.warn(OVERRIDE_FAILURE_WARNING)
          return
        }
        input.model = `${model.providerID}/${model.id}${model.variant ? `#${model.variant}` : ""}`
      } catch {
        console.warn(OVERRIDE_FAILURE_WARNING)
      }
    })

    // Safety net for children created or resumed before the override changed.
    // A child keeps the model it was created with, so the override is only
    // re-applied when it differs. Session hooks have no error channel: every
    // failure degrades silently instead of reaching the host.
    await context.session.hook("prompt", async (event) => {
      try {
        const session = await context.session.get({ sessionID: event.sessionID })
        if (!session.parentID) return
        const state = await findAncestorOverride(event.sessionID, session.parentID, getParentID)
        if (state.mode !== "forced") return
        const model = await resolveCatalogModel(context, state)
        if (!model) return
        const current = session.model
        if (
          current
          && current.providerID === model.providerID
          && current.id === model.id
          && current.variant === model.variant
        ) return
        await context.session.switchModel({ sessionID: event.sessionID, model })
      } catch {
        console.warn(OVERRIDE_FAILURE_WARNING)
      }
    })
  },
})
