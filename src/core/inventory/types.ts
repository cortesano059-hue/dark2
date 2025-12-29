export interface InventoryItem {
  itemId: string;
  amount: number;
}

export interface Inventory {
  userId: string;
  items: Record<string, InventoryItem>;
}