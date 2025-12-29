import { Schema, model } from "mongoose";
const UserSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  money: { type: Number, default: 0 },
  bank: { type: Number, default: 5e3 },
  daily_claim_at: { type: Number, default: 0 },
  work_cooldown: { type: Number, default: 0 },
  trash_cooldown: { type: Number, default: 0 },
  robobadu_cooldown: { type: Number, default: 0 },
  mining_cooldown: { type: Number, default: 0 },
  inventory_cache: [
    {
      id: String,
      name: String,
      count: { type: Number, default: 1 },
      emoji: String
    }
  ]
}, {
  timestamps: true
});
UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });
const User = model("User", UserSchema);
export {
  User
};
