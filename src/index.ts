import { bootstrap } from "#base";

console.log("GUILD_ID:", process.env.GUILD_ID);
console.log("CLIENT_ID:", process.env.CLIENT_ID);

await bootstrap({ meta: import.meta });
