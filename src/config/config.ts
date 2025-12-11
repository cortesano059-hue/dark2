import categories from '@src/config/categories';
import commandIds from '@src/config/commandIds';
import emojiList from '@src/config/EmojiList';
import { env } from '#env';

export default {
    token: env.BOT_TOKEN,
    categories,
    commandIds,
    emojiList
};

