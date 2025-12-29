import { Schema, model } from "mongoose";
const InventorySchema = new Schema({
  userId: String,
  guildId: String,
  itemId: { type: Schema.Types.ObjectId, ref: "Item" },
  amount: { type: Number, default: 1 }
});
InventorySchema.index(
  { userId: 1, guildId: 1, itemId: 1 },
  { unique: true }
);
const Inventory = model("Inventory", InventorySchema);
export {
  Inventory
};
