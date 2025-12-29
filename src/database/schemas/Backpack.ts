import { Schema, model } from "mongoose";

const BackpackSchema = new Schema({
  ownerId: { type: String, required: true, index: true },
  ownerType: { type: String, enum: ['user', 'role', 'system'], default: 'user' },
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  emoji: { type: String, default: "🎒" },
  capacity: { type: Number, default: 10 },
  items: {
    type: Map,
    of: {
      itemId: String,
      amount: Number
    },
    default: {}
  },
  // Access Control
  allowedUsers: { type: [String], default: [] },
  allowedRoles: { type: [String], default: [] },
  accessType: { type: String, enum: ['owner_only', 'custom'], default: 'owner_only' }
});

export const BackpackModel = model("Backpack", BackpackSchema);