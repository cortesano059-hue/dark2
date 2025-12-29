
import console from 'console';
import mongoose from 'mongoose';
import {
    Dni,
    GuildConfig,
    Inventory,
    Item,

    Transaction,
    User
} from '../database/index.js';

const run = async () => {
    const uri = process.env.MONGO_URI || "";
    const TARGET_USER_ID = "1452919662999507065";
    const TARGET_GUILD_ID = "1445264740153692293";

    console.log(`Connecting to new DB via ENV...`);

    try {
        await mongoose.connect(uri);
        console.log(`✅ Connected to DB: ${mongoose.connection.name}`);

        // 1. Create User
        console.log("🌱 Seeding User...");
        await User.findOneAndUpdate(
            { userId: TARGET_USER_ID, guildId: TARGET_GUILD_ID },
            {
                money: 5000,
                bank: 10000,
                xp: 100,
                level: 2
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 2. Create DNI
        console.log("🌱 Seeding DNI...");
        await Dni.findOneAndUpdate(
            { userId: TARGET_USER_ID },
            {
                dni: "12345678A",
                nombre: "Ciudadano",
                apellido: "Ejemplar",
                edad: 25,
                nacionalidad: "Española",
                psid: "TestUser",
                guildId: TARGET_GUILD_ID
            },
            { upsert: true, new: true }
        );

        // 3. Create Guild Config
        console.log("🌱 Seeding GuildConfig...");
        await GuildConfig.findOneAndUpdate(
            { guildId: TARGET_GUILD_ID },
            {
                currencySymbol: "$",
                language: "es",
                initialMoney: 1000
            },
            { upsert: true, new: true }
        );

        // 4. Create Items (Shop)
        console.log("🌱 Seeding Items...");
        const bread = await Item.findOneAndUpdate(
            { itemName: "Pan" },
            { price: 5, emoji: "🍞", description: "Comida básica", type: "normal", guildId: TARGET_GUILD_ID },
            { upsert: true, new: true }
        );

        const phone = await Item.findOneAndUpdate(
            { itemName: "iPhone 15" },
            { price: 1200, emoji: "📱", description: "Teléfono de alta gama", type: "normal", guildId: TARGET_GUILD_ID },
            { upsert: true, new: true }
        );

        // 5. Create Inventory
        console.log("🌱 Seeding Inventory...");
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

        // 6. Create Transaction Log
        console.log("🌱 Seeding Transaction Log...");
        await Transaction.create({
            userId: TARGET_USER_ID,
            guildId: TARGET_GUILD_ID,
            amount: 500,
            type: "daily",
            reason: "Recompensa diaria inicial"
        });

        // 7. Configs (Mining, Police, etc.)
        // 7. Configs (Mining, Police, etc.) -> NOW IN GUILD CONFIG
        console.log("🌱 Seeding Module Configs...");
        await GuildConfig.findOneAndUpdate(
            { guildId: TARGET_GUILD_ID },
            {
                $set: {
                    mining: { requireType: null, requireId: null },
                    police: { roleId: null },
                    mari: {
                        itemName: "Marihuana",
                        minPrice: 20, maxPrice: 50,
                        minConsume: 1, maxConsume: 5
                    }
                }
            },
            { upsert: true }
        );

        console.log("\n✅ ALL COLLECTIONS SEEDED SUCCESSFULLY!");

    } catch (e) {
        console.error("❌ Error seeding DB:", e);
    }

    process.exit();
};

run();
