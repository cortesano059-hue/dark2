import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    BOT_TOKEN: z.string(),
    CLIENT_ID: z.string(),
    OWNER_ID: z.string(),

    // Base de datos
    MONGO_URI: z.string(),
    MONGO_DB: z.string().default("darkdb"),
    DATABASE_NAME: z.string().optional(), // ← requerida por tus archivos
     
    // Aplicación
    GUILD_ID: z.string(),
    PREFIX: z.string().optional(),

    // Logs
    DISCORD_LOG_WEBHOOK_ID: z.string().optional(),
    DISCORD_LOG_WEBHOOK_TOKEN: z.string().optional(),
    WEBHOOK_LOGS_URL: z.string().optional(), // ← requerida por base.error.ts

    BASE_VERSION: z.string().default("1.4.11"),
});

export const env = envSchema.parse(process.env);
