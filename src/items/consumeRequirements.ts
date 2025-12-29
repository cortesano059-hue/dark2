import { normalizeRequirement } from "./normalizeRequirement.js";
import * as eco from "../economy/index.js";
import { EngineContext } from "./types.js";

export async function consumeRequirements(item: any, ctx: EngineContext) {
    if (!item?.requirements || !Array.isArray(item.requirements)) return;

    for (const raw of item.requirements) {
        const req = typeof raw === 'string' ? normalizeRequirement(raw) : raw;

        if (req.type === "money") {
            // req.value
            // Original: type: money, value: X.
            // Wait, does it remove valid currency?
            // checkRequirements.ts does checks. consumeRequirements.ts does REMOVE?
            // Most requirements like Role aren't consumed.
            // Money usually IS consumed.

            // Original consumeRequirements:
            // if (type === money) eco.removeMoney(...)
            // if (type === item) eco.removeItem(...)

            // We need to distinuish consumed vs checked requirements?
            // Or assumes all requirements are costs?
            // The legacy code seemed to imply requirements ARE costs.
            // But Role requirement isn't consumed.

            // I'll stick to original logic: Money and Items are removed.

            if (req.source === "bank") {
                // withdraw? No direct removeBank function yet?
                // withdraw moves bank -> money.
                // We need to BURN money from bank.
                // eco.getBalance returns object.
                // User.bank direct edit?
                // I should check if I have removeBank? No.
                // I'll update eco index later or use manual update.
                // Actually `removeMoney` in legacy had `type` argument...
                // but `checkRequirements` throws error if fail.

                // If I don't have removeBank exposed...
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
            // req.item, req.amount
            if (req.item) {
                await eco.removeItem(ctx.userId, ctx.guildId, req.item, req.amount || 1);
            }
        }
    }
}
