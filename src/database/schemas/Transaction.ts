import { Schema, model } from "mongoose";

export interface ITransaction {
    userId: string;
    targetId?: string;
    guildId: string;
    type: string;
    amount: number;
    from?: string;
    to?: string;
    extra?: Record<string, any>;
    createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
    userId: { type: String, required: true },
    targetId: { type: String },
    guildId: { type: String, required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    from: { type: String },
    to: { type: String },
    extra: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
});

export const Transaction = model<ITransaction>("Transaction", TransactionSchema);
