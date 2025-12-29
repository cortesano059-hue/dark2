import { Schema, model } from "mongoose";

export interface IBadulaqueLocalCooldown {
    guildId: string;
    key: string;
    cooldownUntil: number;
}

const BadulaqueLocalCooldownSchema = new Schema<IBadulaqueLocalCooldown>({
    guildId: { type: String, required: true },
    key: { type: String, required: true },
    cooldownUntil: { type: Number, default: 0 },
});

BadulaqueLocalCooldownSchema.index({ guildId: 1, key: 1 }, { unique: true });

export const BadulaqueLocalCooldown = model<IBadulaqueLocalCooldown>("BadulaqueLocalCooldown", BadulaqueLocalCooldownSchema);
