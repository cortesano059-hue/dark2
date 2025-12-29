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
async function connectMongo() {
  const uri = process.env.MONGO_URI || `mongodb://127.0.0.1:27017/${process.env.DATABASE_NAME || "dark"}`;
  try {
    await mongoose.connect(uri);
    console.log(ck.green(`\u25B8 DataBase`) + " > " + ck.blue(`conectado a ${mongoose.connection.name} `) + ck.green("\u2713"));
  } catch (error) {
    console.error("\u274C Error conectando a MongoDB:", error);
  }
}
export {
  connectMongo
};
