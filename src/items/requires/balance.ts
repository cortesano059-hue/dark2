import * as eco from "../../economy/index.js";
import { Requirement, EngineContext } from "../types.js";

export async function checkBalance(req: Requirement, ctx: EngineContext) {
    const { user, guildId } = ctx;
    const balance = await eco.getBalance(user.id, guildId);

    const amount = Number(req.value || 0);

    if (req.target === "bank") {
        return (balance.bank || 0) >= amount;
    }

    return (balance.money || 0) >= amount;
}
