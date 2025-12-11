import { validateEnv } from "#base";
import { z } from "zod";

export const env = validateEnv(
    z.object({
        // Discord Bot Configuration
        BOT_TOKEN: z.string().min(1, "Discord Bot Token is required"),
        CLIENT_ID: z.string().min(1, "Discord Client ID is required"),
        OWNER_ID: z.string().min(1, "Bot Owner ID is required"),
        GUILD_ID: z.string().optional(),

        // Database Configuration
        MONGO_URI: z.string().min(1, "MongoDb URI is required"),
        DATABASE_NAME: z.string().optional(),

        // Webhook Logging (optional)
        WEBHOOK_LOGS_URL: z
            .string()
            .optional()
            .refine(
                (val) => !val || /^https?:\/\/.+/.test(val),
                { message: "WEBHOOK_LOGS_URL must be a valid URL" }
            ),

        DISCORD_LOG_WEBHOOK_ID: z.string().optional(),
        DISCORD_LOG_WEBHOOK_TOKEN: z.string().optional(),
    })
);
