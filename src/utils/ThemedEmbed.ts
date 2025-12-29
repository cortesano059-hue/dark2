import { EmbedBuilder, CommandInteraction, Interaction, ColorResolvable } from 'discord.js';
import { Emojis } from "../config/EmojiList.js";

const NIBY_ACCENT_COLOR = '#00AACC';
const NIBY_ERROR_COLOR = '#FF5500';

export class ThemedEmbed extends EmbedBuilder {
    constructor(interaction: Interaction | null = null) {
        super();
        this.setColor(NIBY_ACCENT_COLOR as ColorResolvable);
        this.setTimestamp();
    }

    // Método para obtener un embed base que se puede editar
    static base(interaction: Interaction | null = null) {
        return new ThemedEmbed(interaction);
    }

    static success(title: string, description?: string) {
        const embed = new ThemedEmbed();
        const emoji = Emojis.yes;
        embed.setTitle(`${emoji} ${title}`);
        if (description) embed.setDescription(description);
        return embed;
    }

    static error(title: string, description?: string) {
        const embed = new ThemedEmbed();
        const emoji = Emojis.no;
        embed.setTitle(`${emoji} ${title}`).setColor(NIBY_ERROR_COLOR as ColorResolvable);
        if (description) embed.setDescription(description);
        return embed;
    }
}
