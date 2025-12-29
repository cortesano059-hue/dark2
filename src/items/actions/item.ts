import * as eco from "../../economy/index.js";
import { Action, EngineContext } from "../types.js";

export async function actionItem(action: Action, ctx: EngineContext) {
    const { user, guildId } = ctx;
    if (!user || !guildId || !action.itemName) return;

    const qty = action.amount || 1;

    if (action.mode === "add") {
        await eco.addToInventory(user.id, guildId, action.itemName, qty);
        // Track for context feedback
        if (ctx.itemsGiven) {
            ctx.itemsGiven.push({ name: action.itemName, amount: qty });
        }
    }

    if (action.mode === "remove") {
        await eco.removeItem(user.id, guildId, action.itemName, qty);
    }
}
