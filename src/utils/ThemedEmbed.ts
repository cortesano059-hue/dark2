// src/utils/ThemedEmbed.ts

import { EmbedBuilder, ColorResolvable } from 'discord.js';
// FIX: Extensión .js añadida (Soluciona Error 2835)
import Emojis from '../config/EmojiList.js'; 

const NIBY_ACCENT_COLOR: ColorResolvable = '#00AACC'; 
const NIBY_ERROR_COLOR: ColorResolvable = '#FF5500';

class ThemedEmbed extends EmbedBuilder {
    constructor() {
        super();
        this.setColor(NIBY_ACCENT_COLOR).setTimestamp();
    }

    // FIX: Eliminado el parámetro interaction no utilizado (Soluciona Error 6133)
    static base(): ThemedEmbed {
        return new ThemedEmbed();
    }

    static success(title: string, description?: string): ThemedEmbed {
        const embed = new ThemedEmbed();
        const emoji = Emojis?.yes || '✅'; 
        embed.setTitle(`${emoji} ${title}`);
        if (description) embed.setDescription(description);
        return embed;
    }

    static error(title: string, description?: string): ThemedEmbed {
        const embed = new ThemedEmbed();
        const emoji = Emojis?.no || '❌';
        embed.setTitle(`${emoji} ${title}`).setColor(NIBY_ERROR_COLOR);
        if (description) embed.setDescription(description);
        return embed;
    }
}

export default ThemedEmbed;