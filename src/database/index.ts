import ck from "chalk";
import mongoose from "mongoose";

export * from "./schemas/Backpack.js";
export * from "./schemas/BadulaqueLocalCooldown.js";
export * from "./schemas/Dni.js";
export * from "./schemas/DutyStatus.js";
export * from "./schemas/GuildConfig.js";
export * from "./schemas/Inventory.js";
export * from "./schemas/Item.js";
export * from "./schemas/Transaction.js";
export * from "./schemas/User.js";

export async function connectMongo() {
  const uri = process.env.MONGO_URI || `mongodb://127.0.0.1:27017/${process.env.DATABASE_NAME || "dark"}`;

  try {
    await mongoose.connect(uri);
    console.log(ck.green(`▸ DataBase`) + " > " + ck.blue(`conectado a ${mongoose.connection.name} `) + ck.green("✓"));
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error);
  }
}