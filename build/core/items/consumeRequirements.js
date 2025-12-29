import { normalizeRequirement } from "./normalizeRequirement";
async function consumeRequirements(requirements, ctx) {
  for (const raw of requirements) {
    const req = normalizeRequirement(raw);
    const handler = ctx.consume?.[req.type];
    if (!handler) continue;
    await handler(req, ctx);
  }
}
export {
  consumeRequirements
};
