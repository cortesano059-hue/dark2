import { Schema, model, Types } from "mongoose";
import { IItem } from "./Item.js";

export interface IInventory {
  userId: string;
  guildId: string;
  itemId: Types.ObjectId | IItem; // For population
  amount: number;
}

const InventorySchema = new Schema<IInventory>({
  userId: String,
  guildId: String,
  itemId: { type: Schema.Types.ObjectId, ref: "Item" },
  amount: { type: Number, default: 1 },
});

InventorySchema.index(
  { userId: 1, guildId: 1, itemId: 1 },
  { unique: true }
);

export const Inventory = model<IInventory>("Inventory", InventorySchema);