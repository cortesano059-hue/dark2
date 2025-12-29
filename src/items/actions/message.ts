import { Action, EngineContext } from "../types.js";

export async function actionMessage(action: Action, ctx: EngineContext) {
    if (!action.text) return;

    // Replace {item} placeholder
    ctx.customMessage = action.text.replace(/{item}/gi, ctx.item?.itemName ?? "el item");
}
