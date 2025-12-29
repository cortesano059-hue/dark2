import { Schema, model } from "mongoose";
const GuildConfigSchema = new Schema({
  guildId: { type: String, unique: true, required: true },
  prefix: { type: String, default: "." },
  welcomeChannel: { type: String, default: null },
  leaveChannel: { type: String, default: null },
  modsRole: { type: String, default: null },
  initialMoney: { type: Number, default: 0 },
  initialBank: { type: Number, default: 5e3 },
  currencySymbol: { type: String, default: "$" },
  economyLogsChannel: { type: String, default: null },
  // Modules
  mining: {
    requireType: { type: String, enum: ["role", "item", null], default: null },
    requireId: { type: String, default: null }
  },
  police: {
    roleId: { type: String, default: null }
  },
  mari: {
    itemName: { type: String, default: null },
    roleId: { type: String, default: null },
    minConsume: { type: Number, default: 1 },
    maxConsume: { type: Number, default: 5 },
    minPrice: { type: Number, default: 20 },
    maxPrice: { type: Number, default: 50 }
  },
  badulaques: [
    {
      key: { type: String, required: true },
      // central, casino...
      reward: {
        itemName: { type: String, required: true },
        amount: { type: Number, required: true }
      },
      image: { type: String, default: null }
    }
  ],
  incomeRoles: [
    {
      roleId: { type: String, required: true },
      incomePerHour: { type: Number, required: true }
    }
  ]
}, {
  timestamps: true
});
const GuildConfig = model("GuildConfig", GuildConfigSchema);
export {
  GuildConfig
};
