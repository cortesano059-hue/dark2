import { normalizeRequirement } from "./normalizeRequirement";
async function checkRequirements(requirements, ctx) {
  for (const raw of requirements) {
    const req = normalizeRequirement(raw);
    const handler = ctx.requires?.[req.type];
    if (!handler) continue;
    const ok = await handler(req, ctx);
    if (!ok) return false;
  }
  return true;
}
export {
  checkRequirements
};
