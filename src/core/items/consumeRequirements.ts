import type { NormalizedRequirement, EngineContext } from "./types";
import { normalizeRequirement } from "./normalizeRequirement";

export async function consumeRequirements(
  requirements: string[],
  ctx: EngineContext
) {
  for (const raw of requirements) {
    const req: NormalizedRequirement = normalizeRequirement(raw);
    const handler = ctx.consume?.[req.type];
    if (!handler) continue;
    await handler(req, ctx);
  }
}