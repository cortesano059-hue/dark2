import { Schema, model } from "mongoose";

export interface IInventoryItem {
    id: string;
    name: string;
    count: number;
    emoji: string;
}

export interface IUser {
    userId: string;
    guildId: string;
    money: number;
    bank: number;
    daily_claim_at: number;
    work_cooldown: number;
    trash_cooldown: number;
    robobadu_cooldown: number;
    mining_cooldown: number;
    inventory_cache: IInventoryItem[];
}

const UserSchema = new Schema<IUser>({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    money: { type: Number, default: 0 },
    bank: { type: Number, default: 5000 },
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
            emoji: String,
        },
    ],
}, {
    timestamps: true
});

UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export const User = model<IUser>("User", UserSchema);
