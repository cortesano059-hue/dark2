function addToBackpack(backpack, itemId, amount) {
  const slotsUsed = Object.keys(backpack.items).length;
  if (!backpack.items[itemId] && slotsUsed >= backpack.capacity) {
    throw new Error("Backpack is full");
  }
  if (!backpack.items[itemId]) {
    backpack.items[itemId] = { itemId, amount: 0 };
  }
  backpack.items[itemId].amount += amount;
}
function removeFromBackpack(backpack, itemId, amount) {
  const item = backpack.items[itemId];
  if (!item || item.amount < amount) {
    throw new Error("Not enough items in backpack");
  }
  item.amount -= amount;
  if (item.amount === 0) delete backpack.items[itemId];
}
export {
  addToBackpack,
  removeFromBackpack
};
