import { EmbedBuilder } from "discord.js";
import { Emojis } from "../config/EmojiList.js";
const NIBY_ACCENT_COLOR = "#00AACC";
const NIBY_ERROR_COLOR = "#FF5500";
class ThemedEmbed extends EmbedBuilder {
  constructor(interaction = null) {
    super();
    this.setColor(NIBY_ACCENT_COLOR);
    this.setTimestamp();
  }
  // Método para obtener un embed base que se puede editar
  static base(interaction = null) {
    return new ThemedEmbed(interaction);
  }
  static success(title, description) {
    const embed = new ThemedEmbed();
    const emoji = Emojis.yes;
    embed.setTitle(`${emoji} ${title}`);
    if (description) embed.setDescription(description);
    return embed;
  }
  static error(title, description) {
    const embed = new ThemedEmbed();
    const emoji = Emojis.no;
    embed.setTitle(`${emoji} ${title}`).setColor(NIBY_ERROR_COLOR);
    if (description) embed.setDescription(description);
    return embed;
  }
}
export {
  ThemedEmbed
};
