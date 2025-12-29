import {
    InteractionReplyOptions,
    Message,
    MessagePayload,
    RepliableInteraction
} from "discord.js";

/**
 * HybridInteraction: Clase puente que permite usar lógica de Slash Commands con Mensajes.
 * Mapea métodos como reply, editReply y followUp a las funciones equivalentes del objeto Message.
 */
export class HybridInteraction {
    public isHybrid = true;
    public deferred = false;
    public replied = false;
    public ephemeral = false;
    public client: Message["client"];
    public guild: Message["guild"];
    public channel: Message["channel"];
    public user: Message["author"];
    public member: Message["member"];
    public commandName: string;
    public args: string[];

    constructor(message: Message, commandName: string, args: string[]) {
        this.client = message.client;
        this.guild = message.guild;
        this.channel = message.channel;
        this.user = message.author;
        this.member = message.member;
        this.commandName = commandName;
        this.args = args;
        this.message = message;
    }

    private message: Message;

    public async reply(options: string | InteractionReplyOptions | MessagePayload) {
        this.replied = true;
        // En mensajes, la mayoría de respuestas no son "efímeras" en el sentido técnico de Discord,
        // pero podemos tratarlas como tales si es necesario.
        return this.message.reply(options as any);
    }

    public async deferReply(options?: { ephemeral?: boolean }) {
        this.deferred = true;
        this.ephemeral = !!options?.ephemeral;
        // Podríamos enviar un mensaje de "Cargando..." pero por ahora lo dejamos silencioso
        // ya que el procesamiento suele ser rápido.
    }

    public async editReply(options: string | InteractionReplyOptions | MessagePayload) {
        return this.message.reply(options as any);
    }

    public async followUp(options: string | InteractionReplyOptions | MessagePayload) {
        if ("send" in this.message.channel) {
            return (this.message.channel as any).send(options as any);
        }
    }

    // Mapeo básico de opciones
    public options = {
        getString: (_name: string, _required?: boolean) => {
            return this.args.length > 0 ? this.args.join(" ") : null;
        },
        getInteger: (_name: string) => {
            const val = parseInt(this.args[0]);
            return isNaN(val) ? null : val;
        },
        getNumber: (_name: string) => {
            const val = parseFloat(this.args[0]);
            return isNaN(val) ? null : val;
        },
        getUser: (_name: string) => {
            return this.message.mentions.users.first() || null;
        },
        getMember: (_name: string) => {
            return this.message.mentions.members?.first() || null;
        },
        getChannel: (_name: string) => {
            return this.message.mentions.channels.first() || null;
        },
        getRole: (_name: string) => {
            return this.message.mentions.roles.first() || null;
        },
        getBoolean: (_name: string) => {
            const val = this.args[0]?.toLowerCase();
            if (val === "true" || val === "si" || val === "on") return true;
            if (val === "false" || val === "no" || val === "off") return false;
            return null;
        }
    };

    // Helper para detectar si es un objeto compatible con RepliableInteraction
    public isRepliable(): this is RepliableInteraction & { isHybrid: true } {
        return true;
    }
}
