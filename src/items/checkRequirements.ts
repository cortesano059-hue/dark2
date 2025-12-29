import { normalizeRequirement } from "./normalizeRequirement.js";
import { checkBalance } from "./requires/balance.js";
import { checkItem } from "./requires/item.js";
import { checkRole } from "./requires/role.js";
import { EngineContext } from "./types.js";

export async function checkRequirements(item: any, ctx: EngineContext) {
    if (!item?.requirements || !Array.isArray(item.requirements)) return true;

    for (const raw of item.requirements) {
        const req = typeof raw === 'string' ? normalizeRequirement(raw) : raw;

        if (req.type === "money") {
            const ok = await checkBalance(req, ctx);
            if (!ok) throw new Error("REQUIRE_MONEY");
        }

        if (req.type === "item") {
            const ok = await checkItem(req, ctx);
            if (!ok) throw new Error("REQUIRE_ITEM");
        }

        if (req.type === "role") {
            const ok = await checkRole(req, ctx);
            if (!ok) throw new Error("REQUIRE_ROLE");
        }
    }

    return true;
}
