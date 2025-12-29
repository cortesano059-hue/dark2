import type { Inventory } from "./types";

export function addToInventory(
  inventory: Inventory,
  itemId: string,
  amount: number
) {
  if (!inventory.items[itemId]) {
    inventory.items[itemId] = { itemId, amount: 0 };
  }
  inventory.items[itemId].amount += amount;
}

export function removeFromInventory(
  inventory: Inventory,
  itemId: string,
  amount: number
) {
  const item = inventory.items[itemId];
  if (!item || item.amount < amount) {
    throw new Error("Not enough items in inventory");
  }
  item.amount -= amount;
  if (item.amount === 0) delete inventory.items[itemId];
}