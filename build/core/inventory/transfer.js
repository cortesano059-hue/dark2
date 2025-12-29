import { addToBackpack, removeFromBackpack } from "./backpackService";
import { addToInventory, removeFromInventory } from "./inventoryService";
function inventoryToBackpack(inventory, backpack, itemId, amount) {
  removeFromInventory(inventory, itemId, amount);
  addToBackpack(backpack, itemId, amount);
}
function backpackToInventory(backpack, inventory, itemId, amount) {
  removeFromBackpack(backpack, itemId, amount);
  addToInventory(inventory, itemId, amount);
}
export {
  backpackToInventory,
  inventoryToBackpack
};
