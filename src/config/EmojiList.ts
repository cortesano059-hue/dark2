// src/config/EmojiList.ts
interface EmojiList {
    yes: string;
    no: string;
    [key: string]: string;
}

// Puedes expandir esta lista para todos tus emojis
const Emojis: EmojiList = {
    yes: '✅',
    no: '❌',
};

export default Emojis;