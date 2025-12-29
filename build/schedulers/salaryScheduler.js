import { DutyStatus, GuildConfig } from "#database";
import { TextChannel } from "discord.js";
import * as eco from "../economy/index.js";
import { logger } from "../utils/logger.js";
function startSalaryScheduler(client) {
  setInterval(async () => {
    try {
      const now = Date.now();
      const duties = await DutyStatus.find({});
      for (const duty of duties) {
        if (!duty.lastPayment) continue;
        const last = new Date(duty.lastPayment).getTime();
        const diffHours = (now - last) / (1e3 * 60 * 60);
        if (diffHours < 1) continue;
        const config = await GuildConfig.findOne({ guildId: duty.guildId }).lean();
        const roleData = config?.incomeRoles?.find((r) => r.roleId === duty.roleId);
        if (!roleData || !roleData.incomePerHour) {
          await DutyStatus.deleteOne({ _id: duty._id });
          continue;
        }
        const income = roleData.incomePerHour;
        await eco.addBank(
          duty.userId,
          duty.guildId,
          income,
          "salary_auto"
        );
        duty.lastPayment = /* @__PURE__ */ new Date();
        await duty.save();
        const guild = client.guilds.cache.get(duty.guildId) || await client.guilds.fetch(duty.guildId).catch(() => null);
        if (!guild) continue;
        const channel = guild.channels.cache.get(duty.channelId || "") || await guild.channels.fetch(duty.channelId || "").catch(() => null);
        if (channel && channel instanceof TextChannel) {
          await channel.send({
            content: `<@${duty.userId}>`,
            embeds: [
              {
                title: "\u{1F4B5} Pago por servicio (1h)",
                description: `Has recibido **$${income.toLocaleString()}** por tu \xFAltima hora de servicio.`,
                color: 3066993,
                footer: {
                  text: "Sistema autom\xE1tico de salarios"
                }
              }
            ]
          }).catch(() => {
          });
        }
      }
    } catch (err) {
      logger.error("\u274C Error en salaryScheduler:", err);
    }
  }, 60 * 1e3);
}
export {
  startSalaryScheduler
};
