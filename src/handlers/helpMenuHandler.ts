import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ButtonInteraction,
    StringSelectMenuInteraction
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import ThemedEmbed from "@src/utils/ThemedEmbed";
import Emojis from "@src/config/EmojiList";
import Categories from "@src/config/categories";
import MyClient from "../structures/MyClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGEN_SUPERIOR =
    "https://cdn.discordapp.com/attachments/1438575452288581632/1445212702690508851/comandos.png?ex=6932d277&is=693180f7&hm=30874b503c99f89848218bff488491b3691c40c9cffd443ebc6456e7c86c03b5&";

const IMAGEN_INFERIOR =
    "https://cdn.discordapp.com/attachments/1438575452288581632/1445213520194179163/Help__Comandos.png?ex=6932d339&is=693181b9&hm=b6cbbc97d69783bb7ee4d1b04838a753c7a2ab972023709b1583b5f4849cc395&";

const COLOR_PRINCIPAL = "#2b2d31";
const COMMANDS_BASE_PATH = path.join(__dirname, "..", "commands");
const COMMANDS_PER_PAGE = 8;

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                getAllFiles(fullPath, arrayOfFiles);
            } else if (file.endsWith(".js") || file.endsWith(".ts")) {
                arrayOfFiles.push(fullPath);
            }
        }
    } catch {
        // ignoramos
    }
    return arrayOfFiles;
}

function resolveCategoryConfigFromFolder(folderName: string): { key: string; config: any } {
    if ((Categories as any)[folderName]) {
        return { key: folderName, config: (Categories as any)[folderName] };
    }

    for (const [key, cfg] of Object.entries(Categories)) {
        if (Array.isArray((cfg as any).ALIASES) && (cfg as any).ALIASES.includes(folderName)) {
            return { key, config: cfg };
        }
    }

    const lower = folderName.toLowerCase();
    for (const [key, cfg] of Object.entries(Categories)) {
        if (key.toLowerCase() === lower) {
            return { key, config: cfg };
        }
    }

    return {
        key: "Sin categoría",
        config: (Categories as any)["Sin categoría"] || {}
    };
}

function getCommandsForCategory(client: MyClient, categoryFolder: string): any[] {
    const categoryPath = path.join(COMMANDS_BASE_PATH, categoryFolder);
    const files = getAllFiles(categoryPath);

    const commands: any[] = [];

    for (const file of files) {
        const fileName = path.basename(file);
        const commandName = fileName.replace(/\.(js|ts)$/, "");

        const command = client.commands.get(commandName);
        if (command && command.data) {
            commands.push({
                name: `/${command.data.name}`,
                description: command.data.description || "Sin descripción",
                fileName
            });
        } else {
            commands.push({
                name: commandName,
                description: "Sin descripción",
                fileName
            });
        }
    }

    commands.sort((a, b) => a.name.localeCompare(b.name));

    return commands;
}

function buildCategoryPagePayload(client: MyClient, interaction: any, categoryFolder: string, page: number, expiresAt: number): any {
    const { key: categoryKey, config } =
        resolveCategoryConfigFromFolder(categoryFolder);

    const emoji = config?.EMOJI || Emojis.gear || "📁";

    const categoryPath = path.join(COMMANDS_BASE_PATH, categoryFolder);
    if (!fs.existsSync(categoryPath)) {
        const banner = new EmbedBuilder()
            .setImage(IMAGEN_SUPERIOR)
            .setColor(COLOR_PRINCIPAL as any);

        const errorEmbed = new ThemedEmbed(interaction)
            .setColor(COLOR_PRINCIPAL as any)
            .setTitle(`${Emojis.error || "❌"} Error`)
            .setDescription(
                `La categoría **${categoryKey.toUpperCase()}** (\`${categoryFolder}\`) no existe o está vacía.`
            )
            .setImage(IMAGEN_INFERIOR)
            .setFooter({ text: interaction.user.username });

        return {
            embeds: [banner, errorEmbed],
            components: []
        };
    }

    const allCommands = getCommandsForCategory(client, categoryFolder);
    const totalCommands = allCommands.length;

    const totalPages = Math.max(
        1,
        Math.ceil(totalCommands / COMMANDS_PER_PAGE)
    );

    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

    const start = currentPage * COMMANDS_PER_PAGE;
    const end = start + COMMANDS_PER_PAGE;
    const commandsPage = allCommands.slice(start, end);

    const embedBanner = new EmbedBuilder()
        .setImage(IMAGEN_SUPERIOR)
        .setColor(COLOR_PRINCIPAL as any);

    if (commandsPage.length === 0) {
        const emptyEmbed = new ThemedEmbed(interaction)
            .setColor(COLOR_PRINCIPAL as any)
            .setTitle(`${emoji} Categoría: ${categoryKey.toUpperCase()}`)
            .setDescription("Esta categoría no tiene comandos disponibles.")
            .setImage(IMAGEN_INFERIOR)
            .setFooter({ text: interaction.user.username });

        return {
            embeds: [embedBanner, emptyEmbed],
            components: []
        };
    }

    const commandsText = commandsPage
        .map((cmd) => {
            return `**${Emojis.flechaderlong || "▶️"} ${cmd.name}**\n> ${
                cmd.description
            }`;
        })
        .join("\n\n");

    const embedCategory = new ThemedEmbed(interaction)
        .setColor(COLOR_PRINCIPAL as any)
        .setTitle(`${emoji} Categoría: ${categoryKey.toUpperCase()}`)
        .setDescription(commandsText)
        .setThumbnail(client.user!.displayAvatarURL())
        .setImage(IMAGEN_INFERIOR)
        .setFooter({
            text: `Página ${currentPage + 1}/${totalPages} • ${
                totalCommands
            } comando(s) • ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        });

    let commandFolders: string[] = [];
    try {
        commandFolders = fs
            .readdirSync(COMMANDS_BASE_PATH)
            .filter((folder) => {
                const folderPath = path.join(COMMANDS_BASE_PATH, folder);
                return fs.statSync(folderPath).isDirectory();
            })
            .sort((a, b) => a.localeCompare(b));
    } catch {
        commandFolders = [];
    }

    const menuOptions = commandFolders.map((folder) => {
        const files = getAllFiles(path.join(COMMANDS_BASE_PATH, folder));
        const { key, config } = resolveCategoryConfigFromFolder(folder);
        const e = config?.EMOJI || Emojis.gear || "📁";

        const isSelected = folder === categoryFolder;

        return {
            label: key.toUpperCase(),
            value: folder,
            description: `${files.length} comando(s) en esta categoría`,
            emoji: e,
            default: isSelected
        };
    });

    const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(
                `help-category-${interaction.user.id}-${expiresAt}`
            )
            .setPlaceholder("Selecciona una categoría")
            .addOptions(menuOptions)
    );

    const disabledFirstPrev = totalPages === 1 || currentPage === 0;
    const disabledNextLast =
        totalPages === 1 || currentPage === totalPages - 1;

    const firstButton = new ButtonBuilder()
        .setCustomId(
            `help-page-${interaction.user.id}-${categoryFolder}-0-${expiresAt}`
        )
        .setEmoji(Emojis.doubleflechaizq || "⏮️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabledFirstPrev);

    const prevButton = new ButtonBuilder()
        .setCustomId(
            `help-page-${interaction.user.id}-${categoryFolder}-${
                currentPage - 1
            }-${expiresAt}`
        )
        .setEmoji(Emojis.flechaizq || "⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabledFirstPrev);

    const nextButton = new ButtonBuilder()
        .setCustomId(
            `help-page-${interaction.user.id}-${categoryFolder}-${
                currentPage + 1
            }-${expiresAt}`
        )
        .setEmoji(Emojis.flechader || "➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabledNextLast);

    const lastButton = new ButtonBuilder()
        .setCustomId(
            `help-page-${interaction.user.id}-${categoryFolder}-${
                totalPages - 1
            }-${expiresAt}`
        )
        .setEmoji(Emojis.doubleflechader || "⏭️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabledNextLast);

    const buttonsRow = new ActionRowBuilder().addComponents(
        firstButton,
        prevButton,
        nextButton,
        lastButton
    );

    return {
        embeds: [embedBanner, embedCategory],
        components: [menuRow, buttonsRow]
    };
}

async function disableComponents(interaction: any): Promise<void> {
    const rows = interaction.message.components ?? [];
    const disabledRows = rows.map((row: any) => {
        const newRow = ActionRowBuilder.from(row);
        const rebuilt = new ActionRowBuilder();
        newRow.components.forEach((c: any) => {
            const clone = c.setDisabled(true);
            rebuilt.addComponents(clone);
        });
        return rebuilt;
    });

    try {
        await interaction.message.edit({ components: disabledRows });
    } catch {
        // ignorar si no se puede editar
    }
}

export default async (interaction: ButtonInteraction | StringSelectMenuInteraction, client: MyClient): Promise<void> => {
    if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith("help-category-")
    ) {
        const parts = interaction.customId.split("-");
        const targetUserId = parts[2];
        const expiresAt = Number(parts[3]) || 0;

        if (Date.now() > expiresAt) {
            await disableComponents(interaction);
            return interaction.reply({
                content:
                    "⏰ Este menú de ayuda ha expirado. Usa `/comandos` de nuevo.",
                ephemeral: true
            }) as any;
        }

        if (interaction.user.id !== targetUserId) {
            return interaction.reply({
                content:
                    "❌ Solo la persona que ejecutó `/comandos` puede usar este menú.",
                ephemeral: true
            }) as any;
        }

        const categoryFolder = interaction.values[0];

        const payload = buildCategoryPagePayload(
            client,
            interaction,
            categoryFolder,
            0,
            expiresAt
        );

        return interaction.update(payload) as any;
    }

    if (
        interaction.isButton() &&
        interaction.customId.startsWith("help-page-")
    ) {
        const parts = interaction.customId.split("-");
        const targetUserId = parts[2];
        const categoryFolder = parts[3];
        const page = Number(parts[4]) || 0;
        const expiresAt = Number(parts[5]) || 0;

        if (Date.now() > expiresAt) {
            await disableComponents(interaction);
            return interaction.reply({
                content:
                    "⏰ Este menú de ayuda ha expirado. Usa `/comandos` de nuevo.",
                ephemeral: true
            }) as any;
        }

        if (interaction.user.id !== targetUserId) {
            return interaction.reply({
                content:
                    "❌ Solo la persona que ejecutó `/comandos` puede cambiar de página.",
                ephemeral: true
            }) as any;
        }

        const payload = buildCategoryPagePayload(
            client,
            interaction,
            categoryFolder,
            page,
            expiresAt
        );

        return interaction.update(payload) as any;
    }
};

