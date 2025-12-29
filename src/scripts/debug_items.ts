
import mongoose from 'mongoose';
import { GuildConfig } from '../database/schemas/GuildConfig.js';

const run = async () => {
    const uri = process.env.MONGO_URI || "";
    console.log(`Connecting to DB...`);

    try {
        await mongoose.connect(uri);
        console.log(`✅ Connected: ${mongoose.connection.name}`);

        const configs = await GuildConfig.find({});
        console.log(`Found ${configs.length} configs:`);
        configs.forEach(c => {
            console.log(`- Guild: ${c.guildId}`);
            console.log(`  Mining:`, JSON.stringify(c.mining));
        });

    } catch (e) {
        console.error("❌ Error:", e);
    }

    process.exit();
};

run();
