import console from "console";
import mongoose from "mongoose";
import {
  Dni,
  GuildConfig,
  Inventory,
  Item,
  Transaction,
  User
} from "../database/index.js";
const run = async () => {
  const uri = process.env.MONGO_URI || "";
  const TARGET_USER_ID = "1452919662999507065";
  const TARGET_GUILD_ID = "1445264740153692293";
  console.log(`Connecting to new DB via ENV...`);
  try {
    await mongoose.connect(uri);
    console.log(`\u2705 Connected to DB: ${mongoose.connection.name}`);
    console.log("\u{1F331} Seeding User...");
    await User.findOneAndUpdate(
      { userId: TARGET_USER_ID, guildId: TARGET_GUILD_ID },
      {
        money: 5e3,
        bank: 1e4,
        xp: 100,
        level: 2
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log("\u{1F331} Seeding DNI...");
    await Dni.findOneAndUpdate(
      { userId: TARGET_USER_ID },
      {
        dni: "12345678A",
        nombre: "Ciudadano",
        apellido: "Ejemplar",
        edad: 25,
        nacionalidad: "Espa\xF1ola",
        psid: "TestUser",
        guildId: TARGET_GUILD_ID
      },
      { upsert: true, new: true }
    );
    console.log("\u{1F331} Seeding GuildConfig...");
    await GuildConfig.findOneAndUpdate(
      { guildId: TARGET_GUILD_ID },
      {
        currencySymbol: "$",
        language: "es",
        initialMoney: 1e3
      },
      { upsert: true, new: true }
    );
    console.log("\u{1F331} Seeding Items...");
    const bread = await Item.findOneAndUpdate(
      { itemName: "Pan" },
      { price: 5, emoji: "\u{1F35E}", description: "Comida b\xE1sica", type: "normal", guildId: TARGET_GUILD_ID },
      { upsert: true, new: true }
    );
    const phone = await Item.findOneAndUpdate(
      { itemName: "iPhone 15" },
      { price: 1200, emoji: "\u{1F4F1}", description: "Tel\xE9fono de alta gama", type: "normal", guildId: TARGET_GUILD_ID },
      { upsert: true, new: true }
    );
    console.log("\u{1F331} Seeding Inventory...");
    if (bread && phone) {
      await Inventory.findOneAndUpdate(
        { userId: TARGET_USER_ID, guildId: TARGET_GUILD_ID, itemId: bread._id },
        { amount: 10 },
        { upsert: true }
      );
      await Inventory.findOneAndUpdate(
        { userId: TARGET_USER_ID, guildId: TARGET_GUILD_ID, itemId: phone._id },
        { amount: 1 },
        { upsert: true }
      );
    }
    console.log("\u{1F331} Seeding Transaction Log...");
    await Transaction.create({
      userId: TARGET_USER_ID,
      guildId: TARGET_GUILD_ID,
      amount: 500,
      type: "daily",
      reason: "Recompensa diaria inicial"
    });
    console.log("\u{1F331} Seeding Module Configs...");
    await GuildConfig.findOneAndUpdate(
      { guildId: TARGET_GUILD_ID },
      {
        $set: {
          mining: { requireType: null, requireId: null },
          police: { roleId: null },
          mari: {
            itemName: "Marihuana",
            minPrice: 20,
            maxPrice: 50,
            minConsume: 1,
            maxConsume: 5
          }
        }
      },
      { upsert: true }
    );
    console.log("\n\u2705 ALL COLLECTIONS SEEDED SUCCESSFULLY!");
  } catch (e) {
    console.error("\u274C Error seeding DB:", e);
  }
  process.exit();
};
run();
