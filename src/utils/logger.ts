import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { WebhookClient, EmbedBuilder } from 'discord.js';
import Transaction from '@transactionModel';
import { env } from '#env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_FILE = path.join(__dirname, 'bot.log');
const ERROR_FILE = path.join(__dirname, 'error.log');

const WEBHOOK_ID = env.DISCORD_LOG_WEBHOOK_ID;
const WEBHOOK_TOKEN = env.DISCORD_LOG_WEBHOOK_TOKEN;

const LOG_IMAGE = 'https://cdn.discordapp.com/attachments/1438575452288581632/1445213520194179163/Help__Comandos.png?ex=69303039&is=692edeb9&hm=c3449699c25fcab6a696f691bb6bca7b75ffe357395b493a26e4a913cb01226d&';

let webhook: WebhookClient | null = null;
if (WEBHOOK_ID && WEBHOOK_TOKEN) {
    try {
        webhook = new WebhookClient({ id: WEBHOOK_ID, token: WEBHOOK_TOKEN });
    } catch(e) {
        console.error("❌ ERROR: WebhookClient no pudo inicializarse con las credenciales.");
    }
} else {
    console.warn("⚠️ Webhook de LOG no configurado (falta DISCORD_LOG_WEBHOOK_ID/TOKEN).");
}

interface QueueItem {
    type: 'info' | 'warn' | 'error';
    content: string;
    source?: string;
}

const queue: QueueItem[] = [];
let processingQueue = false;

async function processQueue(): Promise<void> {
    if (processingQueue || !webhook) return;
    processingQueue = true;

    while (queue.length > 0) {
        const { type, content, source } = queue.shift()!;

        let title = 'Información';
        let color = '#3498db';

        if (type === 'warn') {
            title = 'Advertencia';
            color = '#f1c40f';
        } else if (type === 'error') {
            title = 'Error';
            color = '#e74c3c';
        }

        if (source) title += ` | ${source}`;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription('```' + content + '```')
            .setColor(color as any)
            .setImage(LOG_IMAGE)
            .setTimestamp();

        try {
            await webhook.send({ embeds: [embed] });
        } catch (err) {
            // Error al enviar al webhook
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    processingQueue = false;
}

interface TransactionLog {
    userId: string;
    targetId?: string | null;
    guildId: string;
    type: string;
    amount: number;
    from?: string | null;
    to?: string | null;
    extra?: Record<string, any>;
}

async function logTransaction({
    userId,
    targetId = null,
    guildId,
    type,
    amount,
    from = null,
    to = null,
    extra = {}
}: TransactionLog): Promise<void> {
    if (!Transaction) return console.error("❌ Modelo Transaction no cargado.");
    try {
        await Transaction.create({
            userId,
            targetId,
            guildId,
            type,
            amount,
            from,
            to,
            extra
        });
    } catch (err) {
        console.error("❌ Error guardando transacción DB:", err);
    }
}

const logger = {
    info: (msg: string, source?: string): void => {
        const message = `[INFO] ${msg}`;
        console.log(message);
        writeLog(LOG_FILE, message);
        queue.push({ type: 'info', content: msg, source });
        processQueue();
    },
    warn: (msg: string, source?: string): void => {
        const message = `[WARN] ${msg}`;
        console.warn(message);
        writeLog(LOG_FILE, message);
        queue.push({ type: 'warn', content: msg, source });
        processQueue();
    },
    error: (msg: string, source?: string): void => {
        const message = `[ERROR] ${msg}`;
        console.error(message);
        writeLog(ERROR_FILE, message);
        queue.push({ type: 'error', content: msg, source });
        processQueue();
    },
    logTransaction
};

function writeLog(file: string, message: string): void {
    try {
        fs.appendFileSync(file, message + '\n', 'utf8');
    } catch (err) {
        console.error('❌ Error escribiendo en log local:', err);
    }
}

export default logger;

