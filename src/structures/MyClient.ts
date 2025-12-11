import { Client, ClientOptions, Collection } from 'discord.js';

/**
 * Extended Discord.js Client with custom properties and methods
 */
export default class MyClient extends Client {
    public commands: Collection<string, any>;
    public components: Collection<string, any>;
    public events: Collection<string, any>;
    // Propiedades consumidas en handlers y eventos
    public commandArray: any[];
    public buttons: Collection<string, any>;
    public selectMenus: Collection<string, any>;
    public modals: Collection<string, any>;

    constructor(options: ClientOptions) {
        super(options);
        this.commands = new Collection();
        this.components = new Collection();
        this.events = new Collection();
        this.commandArray = [];
        this.buttons = new Collection();
        this.selectMenus = new Collection();
        this.modals = new Collection();
    }
}
