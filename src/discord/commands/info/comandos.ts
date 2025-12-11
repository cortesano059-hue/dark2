// src/commands/info/comandos.js
import safeReply from '@src/utils/safeReply';
import { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    EmbedBuilder 
} from 'discord.js';
import ThemedEmbed from '@src/utils/ThemedEmbed';
import Emojis from '@src/config/EmojiList';
import Categories from '@src/config/categories';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { version } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

// Banners
const IMAGEN_SUPERIOR = 'https://cdn.discordapp.com/attachments/1438575452288581632/1445212702690508851/comandos.png';
const IMAGEN_INFERIOR = 'https://cdn.discordapp.com/attachments/1438575452288581632/1445213520194179163/Help__Comandos.png';
const COLOR_PRINCIPAL = '#2b2d31';

// Obtener todos los archivos JS recursivamente
const getAllFiles = (dir, arr = []) => {
    if (!fs.existsSync(dir)) return arr;

    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);

        if (fs.statSync(full).isDirectory()) {
            getAllFiles(full, arr);
        } else if (file.endsWith('.js')) {
            arr.push(full);
        }
    }
    return arr;
};

const command = {
    data: new SlashCommandBuilder()
        .setName('comandos')
        .setDescription('Muestra una lista de todos los comandos disponibles.'),

    async execute(interaction, client) {
        await interaction.deferReply();

        // 🔥 CUSTOM ID ÚNICO POR MENSAJE → FIX REAL
        const menuId = `help-${interaction.id}`;

        const helpData = getHelpMessage(client, interaction, menuId);
        const msg = await safeReply(interaction, helpData);

        // Collector permanente (5m)
        const collector = msg.createMessageComponentCollector({
            time: 5 * 60_000
        });

        collector.on('collect', async select => {
            if (select.user.id !== interaction.user.id) {
                return select.reply({
                    content: '❌ Solo quien ejecutó /comandos puede usar este menú.',
                    ephemeral: true
                });
            }

            const category = select.values[0];
            const embeds = buildCategoryEmbeds(client, interaction, category);

            await select.update({
                embeds,
                components: msg.components
            });
        });

        collector.on('end', async () => {
            if (!msg.editable) return;
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};


// ===========================================================
// MENÚ PRINCIPAL
// ===========================================================
function getHelpMessage(client, interaction, menuId) {
    const commandsRoot = path.join(__dirname, '../');

    const commandFolders = fs.readdirSync(commandsRoot)
        .filter(folder => fs.statSync(path.join(commandsRoot, folder)).isDirectory());

    const commandCount = client.commandArray?.length ?? 0;

    const embedBanner = new EmbedBuilder()
        .setImage(IMAGEN_SUPERIOR)
        .setColor(COLOR_PRINCIPAL);

    const embedInfo = new ThemedEmbed()
        .setColor(COLOR_PRINCIPAL)
        .setTitle(`${Emojis.info} Menú de Ayuda`)
        .setDescription('Selecciona una categoría en el menú de abajo.')
        .addFields([
            { name: `${Emojis.gear} Comandos Totales`, value: `> \`${commandCount}\``, inline: true },
            { name: `${Emojis.flechaderlong} Latencia`, value: `> \`${Math.abs(client.ws.ping)}ms\``, inline: true },
            { name: `${Emojis.box} Versión`, value: `> \`${version}\``, inline: true },
            {
                name: `${Emojis.search} Categorías Disponibles`,
                value: '>>> ' + commandFolders
                    .map(folder => {
                        const cfg = Categories[folder] || Categories['Sin categoría'];
                        return `${cfg.EMOJI} **${folder.toUpperCase()}**`;
                    })
                    .join('\n')
            }
        ])
        .setThumbnail(client.user.displayAvatarURL())
        .setImage(IMAGEN_INFERIOR)
        .setFooter({
            text: `Solicitado por ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        });

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(menuId) // 🔥 ID ÚNICO PARA EL SELECT
            .setPlaceholder('Selecciona una categoría')
            .addOptions(
                commandFolders.map(folder => {
                    const cfg = Categories[folder] || Categories['Sin categoría'];
                    const folderPath = path.join(commandsRoot, folder);
                    const commandFiles = getAllFiles(folderPath);

                    return {
                        label: folder.toUpperCase(),
                        value: folder,
                        description: `${commandFiles.length} comando(s)`,
                        emoji: cfg?.EMOJI ?? Emojis.gear
                    };
                })
            )
    );

    return { embeds: [embedBanner, embedInfo], components: [menuRow] };
}


// ===========================================================
// EMBEDS POR CATEGORÍA
// ===========================================================
function buildCategoryEmbeds(client, interaction, category) {
    const dir = path.join(__dirname, '../', category);

    const embedBanner = new EmbedBuilder()
        .setImage(IMAGEN_SUPERIOR)
        .setColor(COLOR_PRINCIPAL);

    if (!fs.existsSync(dir)) {
        return [
            embedBanner,
            new ThemedEmbed()
                .setColor(COLOR_PRINCIPAL)
                .setTitle(`${Emojis.error} Error`)
                .setDescription(`La categoría **${category.toUpperCase()}** no existe.`)
                .setImage(IMAGEN_INFERIOR)
        ];
    }

    const files = getAllFiles(dir);
    const cfg = Categories[category] || Categories['Sin categoría'];
    const emoji = cfg?.EMOJI ?? Emojis.gear;

    const list = files.map(file => {
        const base = path.basename(file);
        const cmdName = base.replace('.js', '');
        const cmd = client.commands.get(cmdName);

        if (cmd?.data)
            return `**${Emojis.flechaderlong} /${cmd.data.name}**\n> ${cmd.data.description}`;

        return `**${Emojis.flechaderlong} ${cmdName}**\n> Sin descripción`;
    }).join('\n\n');

    const listEmbed = new ThemedEmbed()
        .setColor(COLOR_PRINCIPAL)
        .setTitle(`${emoji} Categoría: ${category.toUpperCase()}`)
        .setDescription(list)
        .setThumbnail(client.user.displayAvatarURL())
        .setImage(IMAGEN_INFERIOR)
        .setFooter({
            text: `${files.length} comando(s) | ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        });

    return [embedBanner, listEmbed];
}

export { buildCategoryEmbeds };
export default command;

