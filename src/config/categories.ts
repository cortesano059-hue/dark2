import { PermissionFlagsBits } from "discord.js";
import EmojiList from "@src/config/EmojiList";

export default {
    info: {
        EMOJI: EmojiList.infoCategory || "📘",
        ALIASES: ["information", "ayuda"],
        GUILD_ONLY: false,
        PERMISSIONS: []
    },

    economy: {
        EMOJI: EmojiList.economy || "💰",
        ALIASES: ["eco"],
        GUILD_ONLY: true,
        PERMISSIONS: []
    },

    inventory: {
        EMOJI: EmojiList.inventory || "📦",
        GUILD_ONLY: true,
        PERMISSIONS: []
    },

    dni: {
        EMOJI: EmojiList.dni || "🪪",
        GUILD_ONLY: true,
        PERMISSIONS: []
    },

    policia: {
        EMOJI: EmojiList.policia || "🚓",
        GUILD_ONLY: true,
        PERMISSIONS: []
    },

    rol: {
        EMOJI: EmojiList.rol || "🎭",
        GUILD_ONLY: true,
        PERMISSIONS: []
    },

    moderacion: {
        EMOJI: EmojiList.moderacion || "🛡️",
        GUILD_ONLY: true,
        PERMISSIONS: [PermissionFlagsBits.ManageGuild]
    },

    developer: {
        EMOJI: EmojiList.developer || "🛠️",
        GUILD_ONLY: false,
        PERMISSIONS: []
    },

    "Sin categoría": {
        EMOJI: EmojiList.warn || "⚠️"
    }
};

