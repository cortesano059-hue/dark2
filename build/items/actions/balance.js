import * as eco from "../../economy/index.js";
async function actionBalance(action, ctx) {
  const { user, guildId } = ctx;
  if (!user || !guildId || !action.amount || action.amount <= 0) return;
  if (action.target === "money") {
    if (action.mode === "add") {
      await eco.addMoney(user.id, guildId, action.amount, "item_use");
      if (ctx.moneyChanges) ctx.moneyChanges.add += action.amount;
    } else {
      await eco.removeMoney(user.id, guildId, action.amount, "item_use");
      if (ctx.moneyChanges) ctx.moneyChanges.remove += action.amount;
    }
  }
  if (action.target === "bank") {
    if (action.mode === "add") {
      await eco.addBank(user.id, guildId, action.amount, "item_use");
      if (ctx.bank?.add !== void 0) ctx.bank.add += action.amount;
    } else {
      await eco.withdraw(user.id, guildId, action.amount);
    }
  }
}
export {
  actionBalance
};
