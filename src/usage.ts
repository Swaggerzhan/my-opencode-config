// Pure computations behind the sidebar's Context Usage meter, extracted so
// test/usage.test.ts can cover them without a TUI. No OpenCode imports here.

export interface UsageTokens {
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}

export interface UsageMessage {
  type: string
  model?: { providerID: string; id: string }
  tokens?: UsageTokens
}

export interface UsageModel {
  providerID: string
  id: string
  modelID: string
  limit?: { context: number }
}

export interface Usage {
  used: number
  limit?: number
}

export function totalTokens(tokens: UsageTokens): number {
  return tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write
}

// The latest assistant message with token usage reflects current context
// occupancy (its prompt + completion). Newer usage-less messages still
// identify the model in use; without any message, the selected model applies.
export function contextUsage(
  messages: readonly UsageMessage[],
  selected: { providerID: string; modelID: string } | undefined,
  models: readonly UsageModel[],
): Usage {
  let used = 0
  let providerID: string | undefined
  let modelID: string | undefined
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.type !== "assistant") continue
    providerID = message.model?.providerID
    modelID = message.model?.id
    if (message.tokens) {
      used = totalTokens(message.tokens)
      break
    }
  }
  providerID ??= selected?.providerID
  modelID ??= selected?.modelID
  const limit = models.find(
    (model) => model.providerID === providerID && (model.modelID === modelID || model.id === modelID),
  )?.limit?.context
  return limit === undefined ? { used } : { used, limit }
}

export const GREEN_BELOW = 100_000
export const RED_FROM = 180_000

export const GREEN = "#3fb950"
export const YELLOW = "#d29922"
export const RED = "#f85149"

export function usageColor(used: number): string {
  return used < GREEN_BELOW ? GREEN : used < RED_FROM ? YELLOW : RED
}

export function usageBar(used: number, limit: number | undefined, width: number): string {
  const filled = limit ? Math.min(Math.round((used / limit) * width), width) : 0
  return "█".repeat(filled) + "░".repeat(width - filled)
}

export function formatK(tokens: number): string {
  return `${Math.round(tokens / 1000)}K`
}

export function usagePercent(used: number, limit: number): number {
  return Math.round((used / limit) * 100)
}
