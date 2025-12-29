import { Schema, model } from "mongoose";
const DutyStatusSchema = new Schema({
  userId: String,
  guildId: String,
  roleId: String,
  startTime: Date,
  lastPayment: Date,
  channelId: String
});
DutyStatusSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const DutyStatus = model("DutyStatus", DutyStatusSchema);
export {
  DutyStatus
};
