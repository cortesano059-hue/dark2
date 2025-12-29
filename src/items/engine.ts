import { normalizeAction } from "./normalizeAction.js";
import { actionBalance } from "./actions/balance.js";
import { actionItem } from "./actions/item.js";
import { actionRole } from "./actions/role.js";
import { actionMessage } from "./actions/message.js";
import { EngineContext } from "./types.js";

export async function runItem(item: any, ctx: EngineContext) {
    if (!item?.actions || !Array.isArray(item.actions)) return;

    // Attach current item to context for visibility
    ctx.item = item;

    for (const raw of item.actions) {
        const action = typeof raw === 'string' ? normalizeAction(raw) : raw;

        if (action.type === "money") {
            await actionBalance(action, ctx);
        } else if (action.type === "item") {
            await actionItem(action, ctx);
        } else if (action.type === "role") {
            await actionRole(action, ctx);
        } else if (action.type === "message") {
            await actionMessage(action, ctx);
        }
    }
}
