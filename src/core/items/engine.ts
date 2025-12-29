import { normalizeAction } from "./normalizeAction";
import type { EngineContext, NormalizedAction } from "./types";

export async function runItem(actions: string[], ctx: EngineContext) {
  for (const raw of actions) {
    const action: NormalizedAction = normalizeAction(raw);
    const handler = ctx.actions[action.type];
    if (!handler) continue;
    await handler(action, ctx);
  }
}