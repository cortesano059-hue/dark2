import {
    ActionRowBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    User,
    Client
} from 'discord.js';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLOR_HELP = 0x2b2d31;
const IMAGEN_HELP_BANNER = "https://i.imgur.com/Fx4Tzov.png";
const IMAGEN_HELP_FOOTER = "https://i.imgur.com/K8QHaom.png";

const CMDS_PER_PAGE = 5;

const EMOJIS = {
    INFO: "💠",
    GEAR: "⚙️",
    PLAY: "⚡",
    BOX: "📦",
    SEARCH: "🔍",
    BAR: "┃"
};

export const CATEGORIES = [
    { label: "Configuración", value: "c_conf", emoji: "⚙️" },
    { label: "Developer", value: "c_dev", emoji: "👨‍💻" },
    { label: "Sist. DNI", value: "c_dni", emoji: "🪪" },
    { label: "Sist. Duty", value: "c_duty", emoji: "🕒" },
    { label: "Economía", value: "c_eco", emoji: "💸" },
    { label: "Zonas Ilegales", value: "c_ile", emoji: "💣" },
    { label: "Información", value: "c_inf", emoji: "📘" },
    { label: "Inventario", value: "c_inv", emoji: "🎒" },
    { label: "Moderación", value: "c_mod", emoji: "🛡️" },
    { label: "Cuerpo Policial", value: "c_pol", emoji: "🚔" },
    { label: "Roleplay", value: "c_rol", emoji: "🎭" }
];

export async function generateHelpPayload(
    client: Client,
    requester: User,
    categoryValue?: string,
    pageIndex = 0,
    commandName?: string,
    stats?: { ping: number, totalCmds: number, version: string, avatar?: string }
) {
    const embeds: EmbedBuilder[] = [];
    const components: ActionRowBuilder<any>[] = [];

    // 1. Embed de Banner Superior
    const bannerTop = new EmbedBuilder()
        .setColor(COLOR_HELP)
        .setImage(IMAGEN_HELP_BANNER);
    embeds.push(bannerTop);

    let navRow: ActionRowBuilder<ButtonBuilder> | null = null;
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (commandName) {
        // MODO DETALLE
        const cleanName = commandName.toLowerCase().replace('/', '');
        const detailEmbed = new EmbedBuilder()
            .setColor(COLOR_HELP)
            .setTitle(`${EMOJIS.SEARCH} Detalle: /${cleanName}`)
            .setDescription(`> **Uso:** \`/${cleanName}\`\n> **Descripción:** Información detallada del comando.`)
            .setImage(IMAGEN_HELP_FOOTER)
            .setThumbnail(stats?.avatar || null)
            .setFooter({
                text: `Solicitado por ${requester.username} • hoy a las ${timeStr}`,
                iconURL: requester.displayAvatarURL()
            });
        embeds.push(detailEmbed);
    } else if (categoryValue) {
        // MODO CATEGORÍA
        const catInfo = CATEGORIES.find(c => c.value === categoryValue) || CATEGORIES[6];

        const physicalMap: Record<string, { folder: string, filter?: string[], exclude?: string[] }> = {
            "c_conf": { folder: "settings" },
            "c_dev": { folder: "developer" },
            "c_dni": { folder: "roleplay", filter: ["dni"] },
            "c_duty": { folder: "jobs", filter: ["duty"] },
            "c_eco": { folder: "economy" },
            "c_ile": { folder: "illegal" },
            "c_inf": { folder: "info" },
            "c_inv": { folder: "inventory" },
            "c_mod": { folder: "moderation" },
            "c_pol": { folder: "roleplay", filter: ["policia"] },
            "c_rol": { folder: "roleplay", filter: ["do", "me", "entorno", "twitter", "ooc", "anonimo"] }
        };

        const config = physicalMap[categoryValue] || { folder: "info" };
        const commandsPath = path.join(__dirname, "..", "discord", "commands", config.folder);

        let allCommands: { name: string, desc: string }[] = [];
        const appCommands = await client.application?.commands.fetch();

        if (fs.existsSync(commandsPath)) {
            const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
            for (const file of files) {
                const name = file.split(".")[0];
                if (config.filter && !config.filter.includes(name)) continue;
                if (config.exclude && config.exclude.includes(name)) continue;

                let displayName = name === "index" ? (config.folder === "info" ? "help" : config.folder) : name;

                // Buscar descripción real en el cache del bot
                const registered = appCommands?.find(c => c.name === displayName);
                let desc = registered?.description || "Sin descripción.";

                // Fallback manual para comandos conocidos si no están en cache global (ej: si son de guild)
                if (desc === "Sin descripción." && displayName === "mochila") desc = "Gestiona tus mochilas y objetos.";

                allCommands.push({ name: displayName, desc });
            }
        }

        const totalPages = Math.ceil(allCommands.length / CMDS_PER_PAGE) || 1;
        const page = Math.max(0, Math.min(pageIndex, totalPages - 1));
        const items = allCommands.slice(page * CMDS_PER_PAGE, (page + 1) * CMDS_PER_PAGE);

        const categoryEmbed = new EmbedBuilder()
            .setColor(COLOR_HELP)
            .setTitle(`${catInfo.emoji} Categoría: ${catInfo.label}`)
            .setImage(IMAGEN_HELP_FOOTER)
            .setThumbnail(stats?.avatar || null)
            .setFooter({
                text: `Solicitado por ${requester.username} • hoy a las ${timeStr}`,
                iconURL: requester.displayAvatarURL()
            });

        if (items.length > 0) {
            const listText = items.map(cmd => `${EMOJIS.BAR} **/${cmd.name}**\n> ${cmd.desc}`).join('\n\n');
            categoryEmbed.setDescription(listText);
        } else {
            categoryEmbed.setDescription("No hay comandos en esta categoría.");
        }
        embeds.push(categoryEmbed);

        if (totalPages > 1) {
            navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder({ customId: `help/nav/${categoryValue}/${page - 1}/${requester.id}`, emoji: "⬅️", style: ButtonStyle.Primary, disabled: page === 0 }),
                new ButtonBuilder({ customId: `help/nav/${categoryValue}/${page + 1}/${requester.id}`, emoji: "➡️", style: ButtonStyle.Primary, disabled: page >= totalPages - 1 })
            );
        }
    } else {
        // MODO PRINCIPAL
        const mainEmbed = new EmbedBuilder()
            .setColor(COLOR_HELP)
            .setTitle(`${EMOJIS.INFO} Menú de Ayuda`)
            .setThumbnail(stats?.avatar || null)
            .setDescription(`Selecciona una categoría en el menú de abajo.`)
            .addFields([
                { name: `${EMOJIS.GEAR} Comandos Totales`, value: `${EMOJIS.BAR} \`${stats?.totalCmds || 36}\``, inline: true },
                { name: `${EMOJIS.PLAY} Latencia`, value: `${EMOJIS.BAR} \`${stats?.ping || 18}ms\``, inline: true },
                { name: `${EMOJIS.BOX} Versión`, value: `${EMOJIS.BAR} \`${stats?.version || "1.2.1"}\``, inline: true },
                {
                    name: `${EMOJIS.SEARCH} Categorías Disponibles`,
                    value: CATEGORIES.map(c => `${EMOJIS.BAR} ${c.emoji} ${c.label}`).join('\n')
                }
            ])
            .setImage(IMAGEN_HELP_FOOTER)
            .setFooter({
                text: `Solicitado por ${requester.username} • hoy a las ${timeStr}`,
                iconURL: requester.displayAvatarURL()
            });

        embeds.push(mainEmbed);
    }

    // 4. Menú de categorías
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`help/menu/${requester.id}`)
        .setPlaceholder("Selecciona una categoría")
        .addOptions(CATEGORIES.map(c => ({
            label: c.label,
            value: c.value,
            emoji: c.emoji
        })));

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    components.push(menuRow);
    if (navRow) components.push(navRow);

    return {
        flags: MessageFlags.Ephemeral,
        embeds: embeds,
        components: components
    };
}
