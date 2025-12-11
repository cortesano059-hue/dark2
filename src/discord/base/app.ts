import { brBuilder } from "@magicyan/discord";
import { CommandManager } from "./commands/manager.js";
import { ResponderManager } from "./responders/manager.js";
import { GenericResponderInteraction } from "./responders/types.js";
import { EventManager } from "./events/manager.js";
import { EventPropData } from "./events/types.js";

export interface BaseCommandsConfig {
    guilds?: string[];
    verbose?: boolean;

    middleware?(
        interaction: any,
        block: () => void
    ): Promise<void>;

    onNotFound?(interaction: any): void;

    onError?(error: unknown, interaction: any): void;
}

export interface BaseRespondersConfig {
    middleware?(
        interaction: GenericResponderInteraction,
        block: () => void,
        params: object
    ): Promise<void>;

    onNotFound?(interaction: GenericResponderInteraction): void;

    onError?(
        error: unknown,
        interaction: GenericResponderInteraction,
        params: object
    ): void;
}

export interface BaseEventsConfig {
    middleware?(
        event: EventPropData,
        block: (...tags: string[]) => void
    ): Promise<void>;

    onError?(error: unknown, event: EventPropData): void;
}

interface BaseConfig {
    commands: BaseCommandsConfig;
    events: BaseEventsConfig;
    responders: BaseRespondersConfig;
}

export class Constatic {
    private static instance: Constatic | null = null;

    public readonly commands: CommandManager;
    public readonly events: EventManager;
    public readonly responders: ResponderManager;

    public readonly config: BaseConfig;

    private constructor() {
        this.commands = new CommandManager();
        this.events = new EventManager();
        this.responders = new ResponderManager();

        // Config por defecto
        this.config = {
            commands: {
                guilds: [],     // tu deploy usa env.GUILD_ID directamente, es correcto
                verbose: false,
            },
            events: {},
            responders: {},
        };
    }

    public static getInstance() {
        if (!Constatic.instance) {
            Constatic.instance = new Constatic();
        }
        return Constatic.instance;
    }

    /** Imprime logs de carga: comandos, responders, eventos */
    public printLoadLogs() {
        console.log(
            brBuilder(
                ...this.commands.logs,
                ...this.responders.logs,
                ...this.events.logs,
            )
        );
    }
}
