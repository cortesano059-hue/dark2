import {
  ActionRowBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COLOR_HELP = 2829617;
const IMAGEN_HELP_BANNER = "https://i.imgur.com/Fx4Tzov.png";
const IMAGEN_HELP_FOOTER = "https://i.imgur.com/K8QHaom.png";
const CMDS_PER_PAGE = 5;
const EMOJIS = {
  INFO: "\u{1F4A0}",
  GEAR: "\u2699\uFE0F",
  PLAY: "\u26A1",
  BOX: "\u{1F4E6}",
  SEARCH: "\u{1F50D}",
  BAR: "\u2503"
};
const CATEGORIES = [
  { label: "Configuraci\xF3n", value: "c_conf", emoji: "\u2699\uFE0F" },
  { label: "Developer", value: "c_dev", emoji: "\u{1F468}\u200D\u{1F4BB}" },
  { label: "Sist. DNI", value: "c_dni", emoji: "\u{1FAAA}" },
  { label: "Sist. Duty", value: "c_duty", emoji: "\u{1F552}" },
  { label: "Econom\xEDa", value: "c_eco", emoji: "\u{1F4B8}" },
  { label: "Zonas Ilegales", value: "c_ile", emoji: "\u{1F4A3}" },
  { label: "Informaci\xF3n", value: "c_inf", emoji: "\u{1F4D8}" },
  { label: "Inventario", value: "c_inv", emoji: "\u{1F392}" },
  { label: "Moderaci\xF3n", value: "c_mod", emoji: "\u{1F6E1}\uFE0F" },
  { label: "Cuerpo Policial", value: "c_pol", emoji: "\u{1F694}" },
  { label: "Roleplay", value: "c_rol", emoji: "\u{1F3AD}" }
];
async function generateHelpPayload(client, requester, categoryValue, pageIndex = 0, commandName, stats) {
  const embeds = [];
  const components = [];
  const bannerTop = new EmbedBuilder().setColor(COLOR_HELP).setImage(IMAGEN_HELP_BANNER);
  embeds.push(bannerTop);
  let navRow = null;
  const now = /* @__PURE__ */ new Date();
  const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
  if (commandName) {
    const cleanName = commandName.toLowerCase().replace("/", "");
    const detailEmbed = new EmbedBuilder().setColor(COLOR_HELP).setTitle(`${EMOJIS.SEARCH} Detalle: /${cleanName}`).setDescription(`> **Uso:** \`/${cleanName}\`
> **Descripci\xF3n:** Informaci\xF3n detallada del comando.`).setImage(IMAGEN_HELP_FOOTER).setThumbnail(stats?.avatar || null).setFooter({
      text: `Solicitado por ${requester.username} \u2022 hoy a las ${timeStr}`,
      iconURL: requester.displayAvatarURL()
    });
    embeds.push(detailEmbed);
  } else if (categoryValue) {
    const catInfo = CATEGORIES.find((c) => c.value === categoryValue) || CATEGORIES[6];
    const physicalMap = {
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
    let allCommands = [];
    const appCommands = await client.application?.commands.fetch();
    if (fs.existsSync(commandsPath)) {
      const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
      for (const file of files) {
        const name = file.split(".")[0];
        if (config.filter && !config.filter.includes(name)) continue;
        if (config.exclude && config.exclude.includes(name)) continue;
        let displayName = name === "index" ? config.folder === "info" ? "help" : config.folder : name;
        const registered = appCommands?.find((c) => c.name === displayName);
        let desc = registered?.description || "Sin descripci\xF3n.";
        if (desc === "Sin descripci\xF3n." && displayName === "mochila") desc = "Gestiona tus mochilas y objetos.";
        allCommands.push({ name: displayName, desc });
      }
    }
    const totalPages = Math.ceil(allCommands.length / CMDS_PER_PAGE) || 1;
    const page = Math.max(0, Math.min(pageIndex, totalPages - 1));
    const items = allCommands.slice(page * CMDS_PER_PAGE, (page + 1) * CMDS_PER_PAGE);
    const categoryEmbed = new EmbedBuilder().setColor(COLOR_HELP).setTitle(`${catInfo.emoji} Categor\xEDa: ${catInfo.label}`).setImage(IMAGEN_HELP_FOOTER).setThumbnail(stats?.avatar || null).setFooter({
      text: `Solicitado por ${requester.username} \u2022 hoy a las ${timeStr}`,
      iconURL: requester.displayAvatarURL()
    });
    if (items.length > 0) {
      const listText = items.map((cmd) => `${EMOJIS.BAR} **/${cmd.name}**
> ${cmd.desc}`).join("\n\n");
      categoryEmbed.setDescription(listText);
    } else {
      categoryEmbed.setDescription("No hay comandos en esta categor\xEDa.");
    }
    embeds.push(categoryEmbed);
    if (totalPages > 1) {
      navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder({ customId: `help/nav/${categoryValue}/${page - 1}/${requester.id}`, emoji: "\u2B05\uFE0F", style: ButtonStyle.Primary, disabled: page === 0 }),
        new ButtonBuilder({ customId: `help/nav/${categoryValue}/${page + 1}/${requester.id}`, emoji: "\u27A1\uFE0F", style: ButtonStyle.Primary, disabled: page >= totalPages - 1 })
      );
    }
  } else {
    const mainEmbed = new EmbedBuilder().setColor(COLOR_HELP).setTitle(`${EMOJIS.INFO} Men\xFA de Ayuda`).setThumbnail(stats?.avatar || null).setDescription(`Selecciona una categor\xEDa en el men\xFA de abajo.`).addFields([
      { name: `${EMOJIS.GEAR} Comandos Totales`, value: `${EMOJIS.BAR} \`${stats?.totalCmds || 36}\``, inline: true },
      { name: `${EMOJIS.PLAY} Latencia`, value: `${EMOJIS.BAR} \`${stats?.ping || 18}ms\``, inline: true },
      { name: `${EMOJIS.BOX} Versi\xF3n`, value: `${EMOJIS.BAR} \`${stats?.version || "1.2.1"}\``, inline: true },
      {
        name: `${EMOJIS.SEARCH} Categor\xEDas Disponibles`,
        value: CATEGORIES.map((c) => `${EMOJIS.BAR} ${c.emoji} ${c.label}`).join("\n")
      }
    ]).setImage(IMAGEN_HELP_FOOTER).setFooter({
      text: `Solicitado por ${requester.username} \u2022 hoy a las ${timeStr}`,
      iconURL: requester.displayAvatarURL()
    });
    embeds.push(mainEmbed);
  }
  const menu = new StringSelectMenuBuilder().setCustomId(`help/menu/${requester.id}`).setPlaceholder("Selecciona una categor\xEDa").addOptions(CATEGORIES.map((c) => ({
    label: c.label,
    value: c.value,
    emoji: c.emoji
  })));
  const menuRow = new ActionRowBuilder().addComponents(menu);
  components.push(menuRow);
  if (navRow) components.push(navRow);
  return {
    flags: MessageFlags.Ephemeral,
    embeds,
    components
  };
}
export {
  CATEGORIES,
  generateHelpPayload
};
