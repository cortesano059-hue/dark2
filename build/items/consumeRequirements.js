import { normalizeRequirement } from "./normalizeRequirement.js";
import * as eco from "../economy/index.js";
async function consumeRequirements(item, ctx) {
  if (!item?.requirements || !Array.isArray(item.requirements)) return;
  for (const raw of item.requirements) {
    const req = typeof raw === "string" ? normalizeRequirement(raw) : raw;
    if (req.type === "money") {
      if (req.source === "bank") {
        const u = await eco.getUser(ctx.userId, ctx.guildId);
        if (u) {
          u.bank = Math.max(0, (u.bank || 0) - (req.value || 0));
          await u.save();
        }
      } else {
        await eco.removeMoney(ctx.userId, ctx.guildId, req.value || 0, "consume_requirement");
      }
    }
    if (req.type === "item") {
      if (req.item) {
        await eco.removeItem(ctx.userId, ctx.guildId, req.item, req.amount || 1);
      }
    }
  }
}
export {
  consumeRequirements
};
