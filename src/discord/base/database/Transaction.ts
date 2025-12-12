import mongoose, { Model, Document } from "mongoose";

export interface ITransaction extends Document {
    userId: string;
    targetId?: string | null;
    guildId: string;
    type: string;
    amount: number;
    from?: string | null;
    to?: string | null;
    extra?: Record<string, any>;
    createdAt: Date;
}

const TransactionSchema = new mongoose.Schema<ITransaction>({
    userId: { type: String, required: true },
    targetId: { type: String, default: null },
    guildId: { type: String, required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
    extra: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now }
});

const Transaction: Model<ITransaction> =
    mongoose.models.Transaction ||
    mongoose.model<ITransaction>("Transaction", TransactionSchema);

export default Transaction;
