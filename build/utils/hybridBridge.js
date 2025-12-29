class HybridInteraction {
  isHybrid = true;
  deferred = false;
  replied = false;
  ephemeral = false;
  client;
  guild;
  channel;
  user;
  member;
  commandName;
  args;
  constructor(message, commandName, args) {
    this.client = message.client;
    this.guild = message.guild;
    this.channel = message.channel;
    this.user = message.author;
    this.member = message.member;
    this.commandName = commandName;
    this.args = args;
    this.message = message;
  }
  message;
  async reply(options) {
    this.replied = true;
    return this.message.reply(options);
  }
  async deferReply(options) {
    this.deferred = true;
    this.ephemeral = !!options?.ephemeral;
  }
  async editReply(options) {
    return this.message.reply(options);
  }
  async followUp(options) {
    if ("send" in this.message.channel) {
      return this.message.channel.send(options);
    }
  }
  // Mapeo básico de opciones
  options = {
    getString: (_name, _required) => {
      return this.args.length > 0 ? this.args.join(" ") : null;
    },
    getInteger: (_name) => {
      const val = parseInt(this.args[0]);
      return isNaN(val) ? null : val;
    },
    getNumber: (_name) => {
      const val = parseFloat(this.args[0]);
      return isNaN(val) ? null : val;
    },
    getUser: (_name) => {
      return this.message.mentions.users.first() || null;
    },
    getMember: (_name) => {
      return this.message.mentions.members?.first() || null;
    },
    getChannel: (_name) => {
      return this.message.mentions.channels.first() || null;
    },
    getRole: (_name) => {
      return this.message.mentions.roles.first() || null;
    },
    getBoolean: (_name) => {
      const val = this.args[0]?.toLowerCase();
      if (val === "true" || val === "si" || val === "on") return true;
      if (val === "false" || val === "no" || val === "off") return false;
      return null;
    }
  };
  // Helper para detectar si es un objeto compatible con RepliableInteraction
  isRepliable() {
    return true;
  }
}
export {
  HybridInteraction
};
