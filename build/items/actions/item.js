import * as eco from "../../economy/index.js";
async function actionItem(action, ctx) {
  const { user, guildId } = ctx;
  if (!user || !guildId || !action.itemName) return;
  const qty = action.amount || 1;
  if (action.mode === "add") {
    await eco.addToInventory(user.id, guildId, action.itemName, qty);
    if (ctx.itemsGiven) {
      ctx.itemsGiven.push({ name: action.itemName, amount: qty });
    }
  }
  if (action.mode === "remove") {
    await eco.removeItem(user.id, guildId, action.itemName, qty);
  }
}
export {
  actionItem
};
