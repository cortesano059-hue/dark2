import { Schema, model } from "mongoose";
const TransactionSchema = new Schema({
  userId: { type: String, required: true },
  targetId: { type: String },
  guildId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  from: { type: String },
  to: { type: String },
  extra: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});
const Transaction = model("Transaction", TransactionSchema);
export {
  Transaction
};
