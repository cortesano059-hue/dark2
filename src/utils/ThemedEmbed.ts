import { EmbedBuilder } from 'discord.js';
import Emojis from "@config/EmojiList";

const NIBY_ACCENT_COLOR = '#00AACC'; 
const NIBY_ERROR_COLOR = '#FF5500';

export default class ThemedEmbed extends EmbedBuilder {
    constructor(interaction: any = null) {
        super();
        this.setColor(NIBY_ACCENT_COLOR as any);
        this.setTimestamp();
    }

    static base(interaction: any = null): ThemedEmbed {
        return new ThemedEmbed(interaction);
    }

    static success(title: string, description?: string): ThemedEmbed {
        const embed = new ThemedEmbed();
        const emoji = (Emojis && Emojis.yes) ? Emojis.yes : '✅';
        embed.setTitle(`${emoji} ${title}`);
        if (description) embed.setDescription(description);
        return embed;
    }

    static error(title: string, description?: string): ThemedEmbed {
        const embed = new ThemedEmbed();
        const emoji = (Emojis && Emojis.no) ? Emojis.no : '❌';
        embed.setTitle(`${emoji} ${title}`).setColor(NIBY_ERROR_COLOR as any);
        if (description) embed.setDescription(description);
        return embed;
    }
}

