import { GuildConfig } from "#database";
import { Colors, EmbedBuilder, WebhookClient } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOGS_DIR, "bot.log");
const ERROR_FILE = path.join(LOGS_DIR, "error.log");
const WEBHOOK_ID = process.env.DISCORD_LOG_WEBHOOK_ID;
const WEBHOOK_TOKEN = process.env.DISCORD_LOG_WEBHOOK_TOKEN;
const LOG_IMAGE = "https://media.discordapp.net/attachments/506838906872922145/551888336525197312/update.png?ex=69505891&is=694f0711&hm=73508e9304d53774807170b8018aec83d46f636313c8916af22670792e99d6c5&";
let webhook = null;
if (WEBHOOK_ID) {
  try {
    if (WEBHOOK_TOKEN) {
      webhook = new WebhookClient({ id: WEBHOOK_ID, token: WEBHOOK_TOKEN });
    }
  } catch {
    console.error("\u274C No se pudo inicializar el Webhook de logs.");
  }
} else {
  console.warn("\u26A0\uFE0F Webhook de logs no configurado (env missing).");
}
const queue = [];
let processing = false;
function safeString(value, max) {
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
    const embed = new EmbedBuilder().setTitle(title || "LOG").setDescription(`\`\`\`
${description}
\`\`\``).setColor(
      level === "error" ? Colors.Red : level === "warn" ? Colors.Yellow : Colors.Blue
    ).setImage(LOG_IMAGE).setTimestamp();
    try {
      await webhook.send({ embeds: [embed] });
    } catch (err) {
      console.error("\u274C Error enviando log por webhook:", err?.message || err);
    }
    await new Promise((r) => setTimeout(r, 1e3));
  }
  processing = false;
}
function writeLog(file, message) {
  try {
    fs.appendFileSync(file, message + "\n", "utf8");
  } catch (err) {
    console.error("\u274C Error escribiendo log local:", err);
  }
}
let discordClient = null;
async function logTransaction({
  userId,
  targetId,
  guildId,
  type,
  amount,
  from,
  to,
  extra = {}
}) {
  try {
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
      createdAt: /* @__PURE__ */ new Date()
    };
    if (discordClient && guildId) {
      const config = await GuildConfig.findOne({ guildId }).lean();
      if (config?.economyLogsChannel) {
        const channel = await discordClient.channels.fetch(config.economyLogsChannel).catch(() => null);
        if (channel) {
          const symbol = config.currencySymbol || "$";
          const isPositive = amount >= 0;
          const color = type.toLowerCase().includes("remove") || amount < 0 ? Colors.Red : Colors.Green;
          const embed = new EmbedBuilder().setAuthor({
            name: "Balance updated",
            iconURL: "https://media.discordapp.net/attachments/506838906872922145/551888336525197312/update.png?ex=69505891&is=694f0711&hm=73508e9304d53774807170b8018aec83d46f636313c8916af22670792e99d6c5&"
          }).setColor(color).addFields(
            { name: "User:", value: `<@${userId}>`, inline: false },
            {
              name: "Amount:",
              value: `Cash: \`${isPositive ? "+" : ""}${amount.toLocaleString()}${symbol}\` | Bank: \`0${symbol}\``,
              inline: false
            },
            { name: "Reason:", value: `\`${type}\``, inline: false }
          ).setFooter({ text: (/* @__PURE__ */ new Date()).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) });
          await channel.send({ embeds: [embed] }).catch((e) => console.error("\u274C Error enviando log a Discord:", e));
        }
      }
    }
    const discUser = discordClient?.users.cache.get(userId);
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
    console.error("\u274C Error guardando transacci\xF3n DB:", err);
  }
}
const logger = {
  setClient(client) {
    discordClient = client;
  },
  info(message, source = null) {
    const line = `[INFO] ${message}`;
    console.log(line);
    writeLog(LOG_FILE, line);
    queue.push({ level: "info", message: String(message), source });
    processQueue();
  },
  warn(message, source = null) {
    const line = `[WARN] ${message}`;
    console.warn(line);
    writeLog(LOG_FILE, line);
    queue.push({ level: "warn", message: String(message), source });
    processQueue();
  },
  error(message, source = null) {
    const line = `[ERROR] ${message}`;
    console.error(line);
    writeLog(ERROR_FILE, line);
    queue.push({ level: "error", message: String(message), source });
    processQueue();
  },
  logTransaction
};
export {
  logger
};
