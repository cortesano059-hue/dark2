import { Schema, model } from "mongoose";
const BadulaqueLocalCooldownSchema = new Schema({
  guildId: { type: String, required: true },
  key: { type: String, required: true },
  cooldownUntil: { type: Number, default: 0 }
});
BadulaqueLocalCooldownSchema.index({ guildId: 1, key: 1 }, { unique: true });
const BadulaqueLocalCooldown = model("BadulaqueLocalCooldown", BadulaqueLocalCooldownSchema);
export {
  BadulaqueLocalCooldown
};
