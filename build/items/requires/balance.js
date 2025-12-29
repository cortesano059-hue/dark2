import * as eco from "../../economy/index.js";
async function checkBalance(req, ctx) {
  const { user, guildId } = ctx;
  const balance = await eco.getBalance(user.id, guildId);
  const amount = Number(req.value || 0);
  if (req.target === "bank") {
    return (balance.bank || 0) >= amount;
  }
  return (balance.money || 0) >= amount;
}
export {
  checkBalance
};
