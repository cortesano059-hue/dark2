import type { Inventory } from "./types";
import type { Backpack } from "./backpackTypes";
import { addToBackpack, removeFromBackpack } from "./backpackService";
import { addToInventory, removeFromInventory } from "./inventoryService";

export function inventoryToBackpack(
  inventory: Inventory,
  backpack: Backpack,
  itemId: string,
  amount: number
) {
  removeFromInventory(inventory, itemId, amount);
  addToBackpack(backpack, itemId, amount);
}

export function backpackToInventory(
  backpack: Backpack,
  inventory: Inventory,
  itemId: string,
  amount: number
) {
  removeFromBackpack(backpack, itemId, amount);
  addToInventory(inventory, itemId, amount);
}