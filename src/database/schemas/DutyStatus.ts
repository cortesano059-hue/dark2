import { Schema, model } from "mongoose";

export interface IDutyStatus {
    userId: string;
    guildId: string;
    roleId: string;
    startTime?: Date;
    lastPayment?: Date;
    channelId?: string;
}

const DutyStatusSchema = new Schema<IDutyStatus>({
    userId: String,
    guildId: String,
    roleId: String,
    startTime: Date,
    lastPayment: Date,
    channelId: String,
});

DutyStatusSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const DutyStatus = model<IDutyStatus>("DutyStatus", DutyStatusSchema);
