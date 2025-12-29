import * as eco from "../../economy/index.js";
import { Requirement, EngineContext } from "../types.js";

export async function checkItem(req: Requirement, ctx: EngineContext) {
    const { user, guildId } = ctx;
    const items = await eco.getUserInventory(user.id, guildId);

    // items is array of objects { itemId, itemName, ... }
    // req.item is name?
    // In normalizeRequirement: item:NAME:AMOUNT

    const targetName = req.item?.toLowerCase();
    const targetAmount = req.amount || 1;

    const found = items.find(i => i.itemName.toLowerCase() === targetName);
    const amount = found ? found.amount : 0;

    if (req.mode === "not_have") {
        return amount < targetAmount;
    }

    return amount >= targetAmount;
}
