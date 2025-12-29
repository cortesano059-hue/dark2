function addToInventory(inventory, itemId, amount) {
  if (!inventory.items[itemId]) {
    inventory.items[itemId] = { itemId, amount: 0 };
  }
  inventory.items[itemId].amount += amount;
}
function removeFromInventory(inventory, itemId, amount) {
  const item = inventory.items[itemId];
  if (!item || item.amount < amount) {
    throw new Error("Not enough items in inventory");
  }
  item.amount -= amount;
  if (item.amount === 0) delete inventory.items[itemId];
}
export {
  addToInventory,
  removeFromInventory
};
