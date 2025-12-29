import * as eco from "../../economy/index.js";
import { Action, EngineContext } from "../types.js";

export async function actionBalance(action: Action, ctx: EngineContext) {
    const { user, guildId } = ctx;
    if (!user || !guildId || !action.amount || action.amount <= 0) return;

    // NormalizeAction guarantees normalized target and mode

    if (action.target === "money") {
        if (action.mode === "add") {
            await eco.addMoney(user.id, guildId, action.amount, "item_use");
            if (ctx.moneyChanges) ctx.moneyChanges.add += action.amount;
        } else {
            // remove
            await eco.removeMoney(user.id, guildId, action.amount, "item_use");
            if (ctx.moneyChanges) ctx.moneyChanges.remove += action.amount;
        }
    }

    if (action.target === "bank") {
        if (action.mode === "add") {
            await eco.addBank(user.id, guildId, action.amount, "item_use");
            if (ctx.bank?.add !== undefined) ctx.bank.add += action.amount;
        } else {
            // withdraw
            await eco.withdraw(user.id, guildId, action.amount);
            // withdraw moves from bank to money!
            // Wait, original action said "withdraw" (eco.withdraw)
            // eco.withdraw transfers Bank -> Wallet.
            // Does action `bank:remove` mean burn money from bank or move to wallet?
            // Original used eco.withdraw (see Step 624 line 34).
            // So `bank:remove` means WITHDRAW TO WALLET.
            // This might be confusing naming but we stick to legacy behavior.
        }
    }
}
