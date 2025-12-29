import { bootstrap } from "#base";
import { connectMongo } from "#database";
import "#server";
import "dotenv/config";

await connectMongo();
await bootstrap({ meta: import.meta });