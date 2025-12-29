
import console from 'console';
import mongoose from 'mongoose';
import {
    BadulaqueLocalCooldown,
    Dni,
    GuildConfig,
    Inventory,
    Item,
    Transaction,
    User
} from '../database/index.js';

const run = async () => {
    const uri = process.env.MONGO_URI || "";
    const TARGET_GUILD_ID = "global_test";

    console.log(`Connecting to new DB for cleanup...`);

    try {
        await mongoose.connect(uri);
        console.log(`✅ Connected to DB: ${mongoose.connection.name}`);

        console.log(`🗑️ Deleting data for guild: ${TARGET_GUILD_ID}`);

        const r1 = await User.deleteMany({ guildId: TARGET_GUILD_ID });
        console.log(`- Users deleted: ${r1.deletedCount}`);

        const r2 = await Dni.deleteMany({ guildId: TARGET_GUILD_ID });
        console.log(`- DNIs deleted: ${r2.deletedCount}`);

        const r3 = await GuildConfig.deleteMany({ guildId: TARGET_GUILD_ID });
        console.log(`- GuildConfig deleted: ${r3.deletedCount}`);

        const r4 = await Item.deleteMany({ guildId: TARGET_GUILD_ID });
        console.log(`- Items deleted: ${r4.deletedCount}`);

        const r5 = await Inventory.deleteMany({ guildId: TARGET_GUILD_ID });
        console.log(`- Inventory items deleted: ${r5.deletedCount}`);

        const r6 = await Transaction.deleteMany({ guildId: TARGET_GUILD_ID });
        console.log(`- Transactions deleted: ${r6.deletedCount}`);

        const r7 = await BadulaqueLocalCooldown.deleteMany({ guildId: TARGET_GUILD_ID });
        console.log(`- Badulaque Cooldowns deleted: ${r7.deletedCount}`);

        console.log("\n✅ CLEANUP COMPLETE!");

    } catch (e) {
        console.error("❌ Error cleaning DB:", e);
    }

    process.exit();
};

run();
