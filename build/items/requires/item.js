import * as eco from "../../economy/index.js";
async function checkItem(req, ctx) {
  const { user, guildId } = ctx;
  const items = await eco.getUserInventory(user.id, guildId);
  const targetName = req.item?.toLowerCase();
  const targetAmount = req.amount || 1;
  const found = items.find((i) => i.itemName.toLowerCase() === targetName);
  const amount = found ? found.amount : 0;
  if (req.mode === "not_have") {
    return amount < targetAmount;
  }
  return amount >= targetAmount;
}
export {
  checkItem
};
