import { Schema, model } from "mongoose";
const ItemSchema = new Schema({
  guildId: String,
  itemName: String,
  description: String,
  emoji: String,
  price: Number,
  inventory: Boolean,
  usable: { type: Boolean, default: true },
  sellable: Boolean,
  stock: Number,
  timeLimit: Number,
  actions: {
    type: [Schema.Types.Mixed],
    default: []
  },
  requirements: {
    type: [Schema.Types.Mixed],
    default: []
  },
  type: {
    type: String,
    enum: ["normal", "container"],
    default: "normal"
  },
  capacity: { type: Number, default: 0 },
  contents: [
    {
      itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
      amount: { type: Number, default: 1, min: 1 }
    }
  ],
  authorizedUsers: { type: [String], default: [] },
  data: { type: Object, default: {} }
});
ItemSchema.index({ guildId: 1, itemName: 1 }, { unique: true });
const Item = model("Item", ItemSchema);
export {
  Item
};
