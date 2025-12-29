import { validateEnv } from "#base";
import "dotenv/config";
import { z } from "zod";
const env = validateEnv(z.object({
  BOT_TOKEN: z.string("Discord Bot Token is required").min(1),
  WEBHOOK_LOGS_URL: z.url().optional(),
  GUILD_ID: z.string().optional(),
  SERVER_PORT: z.coerce.number().min(1).optional(),
  JWT_SECRET: z.string().default("super-secret-key"),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DASHBOARD_URL: z.string().url().default("http://localhost:5173")
}));
export {
  env
};
