import { GuildConfig } from "#database";
import type { Client, TextChannel } from "discord.js";
import { Colors, EmbedBuilder, WebhookClient } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ==========================================================================
 * LOG PATHS
 * ========================================================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = path.join(__dirname, "..", "..", "logs"); // Adjusted path for src/utils -> root/logs

if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOGS_DIR, "bot.log");
const ERROR_FILE = path.join(LOGS_DIR, "error.log");

/* ==========================================================================
 * WEBHOOK CONFIG
 * ========================================================================== */

const WEBHOOK_ID = process.env.DISCORD_LOG_WEBHOOK_ID;
const WEBHOOK_TOKEN = process.env.DISCORD_LOG_WEBHOOK_TOKEN; // Ensure this is in .env or derived

const LOG_IMAGE =
    "https://media.discordapp.net/attachments/506838906872922145/551888336525197312/update.png?ex=69505891&is=694f0711&hm=73508e9304d53774807170b8018aec83d46f636313c8916af22670792e99d6c5&";

/* ==========================================================================
 * WEBHOOK INIT
 * ========================================================================== */

let webhook: WebhookClient | null = null;

if (WEBHOOK_ID) { // Token might need to be passed if using ID/Token pair, or full URL
    try {
        // Assuming env vars provide ID and Token separately or URL. 
        // For now, adapting existing logic.
        if (WEBHOOK_TOKEN) {
            webhook = new WebhookClient({ id: WEBHOOK_ID, token: WEBHOOK_TOKEN });
        }
    } catch {
        console.error("❌ No se pudo inicializar el Webhook de logs.");
    }
} else {
    console.warn("⚠️ Webhook de logs no configurado (env missing).");
}

/* ==========================================================================
 * WEBHOOK QUEUE (ANTI-SPAM)
 * ========================================================================== */

interface LogQueueItem {
    level: "info" | "warn" | "error";
    message: string;
    source?: string | null;
}

const queue: LogQueueItem[] = [];
let processing = false;

function safeString(value: any, max: number) {
    if (!value) return "";
    return String(value).slice(0, max);
}

async function processQueue() {
    if (!webhook || processing) return;
    processing = true;

    while (queue.length) {
        const item = queue.shift();
        if (!item) break;
        const { level, message, source } = item;

        const title = safeString(
            `${level.toUpperCase()}${source ? ` | ${source}` : ""}`,
            256
        );

        const description = safeString(message, 3900);

        const embed = new EmbedBuilder()
            .setTitle(title || "LOG")
            .setDescription(`\`\`\`\n${description}\n\`\`\``)
            .setColor(
                level === "error"
                    ? Colors.Red
                    : level === "warn"
                        ? Colors.Yellow
                        : Colors.Blue
            )
            .setImage(LOG_IMAGE)
            .setTimestamp();

        try {
            await webhook.send({ embeds: [embed] });
        } catch (err: any) {
            console.error("❌ Error enviando log por webhook:", err?.message || err);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    processing = false;
}

/* ==========================================================================
 * FILE LOGGER
 * ========================================================================== */

function writeLog(file: string, message: string) {
    try {
        fs.appendFileSync(file, message + "\n", "utf8");
    } catch (err) {
        console.error("❌ Error escribiendo log local:", err);
    }
}

/* ==========================================================================
 * TRANSACTION LOGGER (DB)
 * ========================================================================== */

interface LogTransactionOptions {
    userId: string;
    targetId?: string;
    guildId: string;
    type: string;
    amount: number;
    from?: string;
    to?: string;
    extra?: object;
}


let discordClient: Client | null = null;

async function logTransaction({
    userId,
    targetId,
    guildId,
    type,
    amount,
    from,
    to,
    extra = {},
}: LogTransactionOptions) {

    try {
        // DB Logging Disabled by User Request to save space
        /*
        const transactionDoc = await Transaction.create({
            userId,
            targetId,
            guildId,
            type,
            amount,
            from,
            to,
            extra,
        });
        */

        // Mock doc for downstream usage
        const transactionDoc = {
            _id: Date.now(),
            userId,
            targetId,
            guildId,
            type,
            amount,
            from,
            to,
            extra,
            createdAt: new Date()
        } as any;

        // Send to Discord Channel if configured
        if (discordClient && guildId) {
            const config = await GuildConfig.findOne({ guildId }).lean();
            if (config?.economyLogsChannel) {
                const channel = await discordClient.channels.fetch(config.economyLogsChannel).catch(() => null) as TextChannel | null;

                if (channel) {
                    const symbol = config.currencySymbol || "$";
                    const isPositive = amount >= 0;
                    const color = type.toLowerCase().includes('remove') || amount < 0 ? Colors.Red : Colors.Green;

                    const embed = new EmbedBuilder()
                        .setAuthor({
                            name: "Balance updated",
                            iconURL: "https://media.discordapp.net/attachments/506838906872922145/551888336525197312/update.png?ex=69505891&is=694f0711&hm=73508e9304d53774807170b8018aec83d46f636313c8916af22670792e99d6c5&"
                        })
                        .setColor(color)
                        .addFields(
                            { name: "User:", value: `<@${userId}>`, inline: false },
                            {
                                name: "Amount:",
                                value: `Cash: \`${isPositive ? '+' : ''}${amount.toLocaleString()}${symbol}\` | Bank: \`0${symbol}\``,
                                inline: false
                            },
                            { name: "Reason:", value: `\`${type}\``, inline: false }
                        )
                        .setFooter({ text: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) });

                    await channel.send({ embeds: [embed] }).catch(e => console.error("❌ Error enviando log a Discord:", e));
                }
            }
        }

        // Enrich with Discord data for Socket
        const discUser = discordClient?.users.cache.get(userId);

        // Emit to Dashboard Real-Time
        const { emitToDashboard } = await import("../server/socket.js");
        emitToDashboard("activity_update", {
            guildId,
            activity: {
                id: transactionDoc._id,
                user: discUser?.username || "Usuario Desconocido",
                avatar: discUser?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
                type: transactionDoc.type,
                amount: transactionDoc.amount,
                timestamp: transactionDoc.createdAt
            }
        });
    } catch (err) {
        console.error("❌ Error guardando transacción DB:", err);
    }
}

/* ==========================================================================
 * PUBLIC LOGGER API
 * ========================================================================== */

export const logger = {
    setClient(client: Client) {
        discordClient = client;
    },
    info(message: any, source: string | null = null) {
        const line = `[INFO] ${message}`;
        console.log(line);
        writeLog(LOG_FILE, line);
        queue.push({ level: "info", message: String(message), source });
        processQueue();
    },

    warn(message: any, source: string | null = null) {
        const line = `[WARN] ${message}`;
        console.warn(line);
        writeLog(LOG_FILE, line);
        queue.push({ level: "warn", message: String(message), source });
        processQueue();
    },

    error(message: any, source: string | null = null) {
        const line = `[ERROR] ${message}`;
        console.error(line);
        writeLog(ERROR_FILE, line);
        queue.push({ level: "error", message: String(message), source });
        processQueue();
    },

    logTransaction,
};
