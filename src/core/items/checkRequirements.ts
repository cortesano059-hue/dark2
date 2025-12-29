import type { NormalizedRequirement, EngineContext } from "./types";
import { normalizeRequirement } from "./normalizeRequirement";

export async function checkRequirements(
  requirements: string[],
  ctx: EngineContext
): Promise<boolean> {
  for (const raw of requirements) {
    const req: NormalizedRequirement = normalizeRequirement(raw);
    const handler = ctx.requires?.[req.type];
    if (!handler) continue;

    const ok = await handler(req, ctx);
    if (!ok) return false;
  }
  return true;
}